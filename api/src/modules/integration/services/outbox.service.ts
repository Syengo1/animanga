// C:\Projects\animanga-platform\api\src\modules\integration\services\outbox.service.ts
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

interface RawOutboxMessage {
  id: string;
  aggregate_id: string;
  event_type: string;
  deduplication_key: string;
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
  private readonly ACTIVE_POLL_MS = 2000;
  private readonly IDLE_POLL_MS = 8000;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectQueue('payments') private readonly paymentsQueue: Queue,
    @InjectQueue('ticket-delivery') private readonly deliveryQueue: Queue,
    @InjectQueue('email-queue') private readonly emailQueue: Queue,
  ) {}

  onApplicationBootstrap() {
    const isEnabled = process.env.OUTBOX_DISPATCHER_ENABLED !== 'false';
    if (isEnabled) {
      this.scheduleNextPoll(this.ACTIVE_POLL_MS);
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
      clearTimeout(this.timer);
    }
  }

  private scheduleNextPoll(delayMs: number) {
    if (this.isShuttingDown) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.dispatchOutboxMessages(), delayMs);
  }

  async dispatchOutboxMessages(): Promise<void> {
    if (this.isShuttingDown || this.isPolling) return;
    this.isPolling = true;
    let nextDelay = this.IDLE_POLL_MS;

    try {
      // Single atomic PostgreSQL statement — no explicit multi-roundtrip transaction needed
      const result: unknown = await this.dataSource.query(
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
        Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
      const messages = (rows as RawOutboxMessage[]) || [];

      if (messages.length > 0) {
        nextDelay = this.ACTIVE_POLL_MS;
        this.logger.log(`Dispatching ${messages.length} outbox messages...`);
      }

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
                jobId: msg.deduplication_key.replace(/:/g, '-'),
                removeOnComplete: true,
                attempts: 3,
                backoff: { type: 'exponential', delay: 5000 },
              },
            );
          } else if (
            msg.event_type === 'USER_REGISTERED' ||
            msg.event_type === 'USER_ACTIVATED'
          ) {
            await this.emailQueue.add(
              msg.event_type,
              {
                eventType: msg.event_type,
                payload: msg.payload,
                deduplicationKey: msg.deduplication_key,
              },
              {
                jobId: msg.deduplication_key.replace(/:/g, '-'),
                attempts: 3,
                backoff: { type: 'exponential', delay: 2000 },
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

          // SECURITY FIX: Parameterized interval multiplication ($2 * INTERVAL '1 second')
          await this.dataSource.query(
            `UPDATE integration.outbox_messages SET status = $1, next_attempt_at = NOW() + ($2 * INTERVAL '1 second'), last_error = $3 WHERE id = $4`,
            [nextStatus, delaySeconds, err.message, msg.id],
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
      this.scheduleNextPoll(nextDelay);
    }
  }
}
