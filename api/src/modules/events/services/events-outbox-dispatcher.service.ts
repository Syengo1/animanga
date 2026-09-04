import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { OutboxMessage } from '../../integration/entities/outbox-message.entity';
import { OutboxStatus } from '../../integration/enums/integration.enums';
import { TicketDeliveryJobData } from '../dto/ticket-delivery.dto'; // <-- Imported strict DTO

@Injectable()
export class EventsOutboxDispatcherService {
  private readonly logger = new Logger(EventsOutboxDispatcherService.name);
  private isPolling = false;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    // FIX: Strongly type the BullMQ Queue to eliminate 'any' parameters
    @InjectQueue('ticket-delivery')
    private readonly deliveryQueue: Queue<TicketDeliveryJobData>,
  ) {}

  // Poll every 5 seconds
  @Cron(CronExpression.EVERY_5_SECONDS)
  async dispatchTicketDeliveries(): Promise<void> {
    if (this.isPolling) return; // Prevent overlapping runs on the same pod
    this.isPolling = true;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      await queryRunner.startTransaction();

      // 1. Claim a batch of messages securely using SKIP LOCKED
      const messages = await queryRunner.manager
        .createQueryBuilder(OutboxMessage, 'outbox')
        .setLock('pessimistic_write')
        .setOnLocked('skip_locked')
        .where('outbox.event_type = :eventType', {
          eventType: 'TICKET_DELIVERY_REQUESTED',
        })
        .andWhere('outbox.status IN (:...statuses)', {
          statuses: [OutboxStatus.PENDING, OutboxStatus.FAILED],
        })
        .andWhere('outbox.next_attempt_at <= NOW()')
        .limit(50)
        .getMany();

      if (messages.length === 0) {
        await queryRunner.commitTransaction();
        return;
      }

      this.logger.debug(
        `Claimed ${messages.length} pending ticket delivery messages`,
      );

      // 2. Push to BullMQ and update states
      for (const msg of messages) {
        try {
          // FIX: Safely cast through unknown to eliminate ESLint any-flow
          const rawPayload: unknown =
            typeof msg.payload === 'string'
              ? (JSON.parse(msg.payload) as unknown)
              : (msg.payload as unknown);

          const payload = rawPayload as TicketDeliveryJobData;

          // Enqueue to Redis - fully type-checked now
          await this.deliveryQueue.add(
            'deliver-ticket',
            {
              outboxMessageId: msg.id,
              ticketId: payload.ticketId,
              orderId: payload.orderId,
            },
            {
              jobId: msg.deduplicationKey.replace(/:/g, '-'), // FIX: BullMQ forbids colons in custom IDs
              removeOnComplete: true,
              attempts: 3,
              backoff: { type: 'exponential', delay: 5000 },
            },
          );

          // Mark as PROCESSING so the dispatcher doesn't pick it up again
          msg.status = OutboxStatus.PROCESSING;
        } catch (err) {
          this.logger.error(`Failed to enqueue outbox message ${msg.id}`, err);
          // Leave it as PENDING/FAILED, the next CRON tick will retry it
        }
      }

      // 3. Save state and release locks
      await queryRunner.manager.save(messages);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Error in Outbox Dispatcher', error);
    } finally {
      await queryRunner.release();
      this.isPolling = false;
    }
  }
}
