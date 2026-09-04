import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { TicketDeliveryJobData } from '../dto/ticket-delivery.dto';
import { TicketDelivery } from '../entities/ticket-delivery.entity';
import { Ticket } from '../entities/ticket.entity';
import { OutboxMessage } from '../../integration/entities/outbox-message.entity';
import { DeliveryStatus, DeliveryChannel } from '../enums/events.enums';
import { OutboxStatus } from '../../integration/enums/integration.enums';
import { MockEmailAdapter } from '../adapters/notification.adapter';
import { Order } from '../../commerce/entities/order.entity';

@Injectable()
export class TicketDeliveryService {
  private readonly logger = new Logger(TicketDeliveryService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly emailAdapter: MockEmailAdapter,
  ) {}

  async deliver(jobData: TicketDeliveryJobData): Promise<void> {
    this.logger.debug(`Processing delivery job for Ticket ${jobData.ticketId}`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Lock the Outbox Message to prevent concurrent dispatcher runs
      const outboxMsg = await queryRunner.manager.findOne(OutboxMessage, {
        where: { id: jobData.outboxMessageId },
        lock: { mode: 'pessimistic_write' },
      });

      // FIX: Check for PUBLISHED instead of COMPLETED
      if (!outboxMsg || outboxMsg.status === OutboxStatus.PUBLISHED) {
        this.logger.log(
          `Delivery job for Ticket ${jobData.ticketId} already processed. Skipping.`,
        );
        await queryRunner.rollbackTransaction();
        return;
      }

      // 2. Load the canonical ticket and customer info using TypeORM v0.3 object relation syntax
      const ticket = await queryRunner.manager.findOneOrFail(Ticket, {
        where: { id: jobData.ticketId },
        relations: {
          ticketType: {
            event: true,
          },
        },
      });

      const order = await queryRunner.manager.findOneOrFail(Order, {
        where: { id: jobData.orderId },
        relations: {
          customer: true,
        },
      });

      const customerEmail = order.customer.email;

      // 3. Idempotency Check & Delivery Record Creation
      let delivery = await queryRunner.manager.findOne(TicketDelivery, {
        where: { ticketId: jobData.ticketId, channel: DeliveryChannel.EMAIL },
        lock: { mode: 'pessimistic_write' },
      });

      if (!delivery) {
        delivery = queryRunner.manager.create(TicketDelivery, {
          ticketId: jobData.ticketId,
          channel: DeliveryChannel.EMAIL,
          destination: customerEmail,
          status: DeliveryStatus.PENDING,
          attemptCount: 0,
        });
      }

      if (delivery.status === DeliveryStatus.SENT) {
        this.logger.log(
          `Ticket ${jobData.ticketId} already delivered to ${customerEmail}.`,
        );
        outboxMsg.status = OutboxStatus.PUBLISHED; // FIX
        await queryRunner.manager.save(outboxMsg);
        await queryRunner.commitTransaction();
        return;
      }

      // 4. Update state to PROCESSING
      delivery.status = DeliveryStatus.PROCESSING;
      delivery.attemptCount += 1;
      await queryRunner.manager.save(delivery);

      // 5. Render deterministic artifact

      const canonicalString = JSON.stringify(
        ticket.qrPayload,
        Object.keys(ticket.qrPayload || {}).sort(),
      );
      const qrBuffer = Buffer.from(
        `QR_CODE_DATA:[${canonicalString}]_SIG:[${ticket.signature}]`,
      );

      // 6. Dispatch via Adapter
      const result = await this.emailAdapter.sendTicket({
        destination: customerEmail,
        ticketId: ticket.id,
        eventName: ticket.ticketType.event.title,
        qrBuffer,
      });

      // 7. Resolve Final State
      if (result.success) {
        delivery.status = DeliveryStatus.SENT;
        delivery.providerMessageId = result.messageId;
        outboxMsg.status = OutboxStatus.PUBLISHED; // FIX
      } else {
        delivery.status =
          delivery.attemptCount >= 3
            ? DeliveryStatus.DEAD_LETTER
            : DeliveryStatus.FAILED;
        delivery.lastError = result.error || 'Unknown error';
        outboxMsg.status = OutboxStatus.FAILED;
      }

      await queryRunner.manager.save(delivery);
      await queryRunner.manager.save(outboxMsg);

      await queryRunner.commitTransaction();
      this.logger.log(
        `Successfully completed delivery cycle for Ticket ${ticket.id}`,
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Failed to process delivery for ticket ${jobData.ticketId}`,
        error,
      );
      throw error; // Let BullMQ catch it and retry the job
    } finally {
      await queryRunner.release();
    }
  }
}
