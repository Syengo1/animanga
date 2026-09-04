import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { OutboxStatus } from '../enums/integration.enums';

// Strictly type the raw PostgreSQL result to eliminate 'any'
interface RawOutboxMessage {
  id: string;
  aggregate_id: string;
  event_type: string; // <-- Added to allow routing
  deduplication_key: string; // <-- Added for BullMQ jobId mapping
  payload: Record<string, unknown>;
  attempt_count: number;
}

@Injectable()
export class OutboxService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(OutboxService.name);
  private timer: NodeJS.Timeout | null = null;
  private isShuttingDown = false;
  private isPolling = false;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectQueue('payments') private readonly paymentsQueue: Queue,
    @InjectQueue('ticket-delivery') private readonly deliveryQueue: Queue, // <-- Added centralized routing queue
  ) {}

  onApplicationBootstrap() {
    // Polling is configured here. Set OUTBOX_DISPATCHER_ENABLED=false in tests if needed.
    const isEnabled = process.env.OUTBOX_DISPATCHER_ENABLED !== 'false';
    if (isEnabled) {
      this.timer = setInterval(() => void this.dispatchOutboxMessages(), 2000);
      this.logger.log('Centralized Transactional Outbox dispatcher started.');
    } else {
      this.logger.warn(
        'Centralized Transactional Outbox dispatcher is disabled.',
      );
    }
  }

  onApplicationShutdown() {
    this.isShuttingDown = true;
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  async dispatchOutboxMessages(): Promise<void> {
    if (this.isShuttingDown || this.isPolling) return;
    this.isPolling = true;

    try {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();

      let messages: RawOutboxMessage[] = [];

      await queryRunner.startTransaction();
      try {
        const result: unknown = await queryRunner.query(
          `
          UPDATE integration.outbox_messages
          SET 
            status = $1,
            attempt_count = attempt_count + 1
          WHERE id IN (
            SELECT id FROM integration.outbox_messages
            WHERE status IN ($2, $3) AND next_attempt_at <= NOW()
            ORDER BY created_at ASC
            LIMIT 50
            FOR UPDATE SKIP LOCKED
          )
          RETURNING *;
        `,
          [OutboxStatus.PROCESSING, OutboxStatus.PENDING, OutboxStatus.FAILED],
        );

        const rows =
          Array.isArray(result) && Array.isArray(result[0])
            ? result[0]
            : result;
        messages = rows as RawOutboxMessage[];

        await queryRunner.commitTransaction();
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }

      if (messages.length > 0) {
        this.logger.log(`Dispatching ${messages.length} outbox messages...`);
      }

      // 2. Centralized Routing Logic
      for (const msg of messages) {
        try {
          if (msg.event_type === 'FULFILL_ORDER') {
            await this.paymentsQueue.add('fulfill-order', msg.payload, {
              jobId: msg.aggregate_id,
              attempts: 3,
              backoff: { type: 'exponential', delay: 2000 },
            });
          } else if (msg.event_type === 'TICKET_DELIVERY_REQUESTED') {
            await this.deliveryQueue.add(
              'deliver-ticket',
              {
                outboxMessageId: msg.id,
                ticketId: msg.payload.ticketId,
                orderId: msg.payload.orderId,
              },
              {
                jobId: msg.deduplication_key.replace(/:/g, '-'), // BullMQ rejects colons
                removeOnComplete: true,
                attempts: 3,
                backoff: { type: 'exponential', delay: 5000 },
              },
            );
          } else {
            this.logger.warn(
              `Unknown event_type [${msg.event_type}] for outbox message ${msg.id}`,
            );
          }

          await this.dataSource.query(
            `UPDATE integration.outbox_messages SET status = $1, published_at = NOW() WHERE id = $2`,
            [OutboxStatus.PUBLISHED, msg.id],
          );
        } catch (dispatchError) {
          const err = dispatchError as Error;
          this.logger.error(
            `Failed to dispatch outbox message ${msg.id}: ${err.message}`,
          );

          const attempt = msg.attempt_count;
          const delaySeconds = Math.pow(2, attempt);
          const nextStatus =
            attempt >= 5 ? OutboxStatus.DEAD_LETTER : OutboxStatus.FAILED;

          await this.dataSource.query(
            `UPDATE integration.outbox_messages SET status = $1, next_attempt_at = NOW() + INTERVAL '${delaySeconds} seconds', last_error = $2 WHERE id = $3`,
            [nextStatus, err.message, msg.id],
          );
        }
      }
    } catch (error) {
      this.logger.error(
        'Outbox polling iteration failed',
        (error as Error).stack,
      );
    } finally {
      this.isPolling = false;
    }
  }
}
