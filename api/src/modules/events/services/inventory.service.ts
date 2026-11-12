// C:\Projects\animanga-platform\api\src\modules\events\services\inventory.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TicketInventory } from '../entities/ticket-inventory.entity';
import { TicketReservation } from '../entities/ticket-reservation.entity';
import { ReservationStatus } from '../enums/events.enums';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);
  private isReaping = false;

  constructor(
    @InjectRepository(TicketInventory)
    private readonly inventoryRepo: Repository<TicketInventory>,
    @InjectRepository(TicketReservation)
    private readonly reservationRepo: Repository<TicketReservation>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Automatically releases expired 15-minute checkout reservations back into available inventory.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async releaseExpiredReservations(): Promise<number> {
    if (this.isReaping) return 0;
    this.isReaping = true;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const expiredReservations = await queryRunner.manager
        .createQueryBuilder(TicketReservation, 'res')
        .innerJoinAndSelect('res.ticketType', 'tt')
        .where('res.status = :status', { status: ReservationStatus.RESERVED })
        .andWhere('res.expiresAt <= NOW()')
        .setLock('pessimistic_write')
        .take(50)
        .getMany();

      if (expiredReservations.length === 0) {
        await queryRunner.rollbackTransaction();
        return 0;
      }

      for (const res of expiredReservations) {
        const inventory = await queryRunner.manager.findOne(TicketInventory, {
          where: { ticketTypeId: res.ticketType.id },
          lock: { mode: 'pessimistic_write' },
        });

        if (inventory) {
          inventory.reservedQuantity = Math.max(
            0,
            inventory.reservedQuantity - res.quantity,
          );
          inventory.availableQuantity += res.quantity;
          await queryRunner.manager.save(inventory);
        }

        res.status = ReservationStatus.EXPIRED;
        res.releasedAt = new Date();
        await queryRunner.manager.save(res);
      }

      await queryRunner.commitTransaction();
      this.logger.log(
        `Released ${expiredReservations.length} expired ticket reservations.`,
      );
      return expiredReservations.length;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        'Failed to release expired ticket reservations',
        error instanceof Error ? error.stack : String(error),
      );
      return 0;
    } finally {
      await queryRunner.release();
      this.isReaping = false;
    }
  }
}
