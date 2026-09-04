import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { createHash } from 'crypto';

import { ProviderEvent } from '../entities/provider-event.entity';
import {
  ProviderEventProcessing,
  ProviderEventProcessingStatus,
} from '../entities/provider-event-processing.entity';
import { OutboxMessage } from '../entities/outbox-message.entity';
import { ProviderTransaction } from '../entities/provider-transaction.entity'; // <-- Imported
import { CanonicalWebhookInput } from '../dto/webhook.dto';
import { OutboxStatus } from '../enums/integration.enums';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async processIncomingWebhook(input: CanonicalWebhookInput) {
    const payloadHash = createHash('sha256')
      .update(JSON.stringify(input.rawPayload))
      .digest('hex');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 0. Locate the existing ProviderTransaction (The Intent) using the internal reference ID
      const providerTx = await queryRunner.manager.findOne(
        ProviderTransaction,
        {
          where: {
            provider: input.provider,
            providerTransactionId: input.internalReferenceId,
          },
        },
      );

      // 1. Insert Immutable Fact and link the chain!
      const event = queryRunner.manager.create(ProviderEvent, {
        provider: input.provider,
        providerEventId: input.providerEventId,
        providerTransaction: providerTx ? { id: providerTx.id } : undefined, // <-- The missing architectural link!
        eventType: input.eventType,
        idempotencyKey: input.providerEventId,
        payloadHash,
        rawPayload: input.rawPayload as Record<string, unknown>,
      });
      const savedEvent = await queryRunner.manager.save(event);

      // 2. Insert Mutable Processing State
      const processing = queryRunner.manager.create(ProviderEventProcessing, {
        providerEventId: savedEvent.id,
        status: ProviderEventProcessingStatus.PENDING,
      });
      await queryRunner.manager.save(processing);

      // 3. Insert Outbox Message (Guaranteed Delivery)
      const outboxMsg = queryRunner.manager.create(OutboxMessage, {
        aggregateType: 'PROVIDER_EVENT',
        aggregateId: savedEvent.id,
        eventType: 'FULFILL_ORDER',
        payload: {
          providerEventId: savedEvent.id,
          provider: input.provider,
          eventType: input.eventType,
          internalReferenceId: input.internalReferenceId,
          providerTransactionId: input.providerTransactionId,
          amount: input.amount,
          currency: input.currency,
        },
        status: OutboxStatus.PENDING,
        deduplicationKey: `outbox:fulfill:${savedEvent.id}`,
        nextAttemptAt: new Date(),
      });
      await queryRunner.manager.save(outboxMsg);

      await queryRunner.commitTransaction();
      this.logger.log(
        `Inbox saved canonical event & Outbox queued: ${savedEvent.providerEventId}`,
      );

      return savedEvent.id;
    } catch (error: unknown) {
      await queryRunner.rollbackTransaction();
      if (this.isPgError(error) && error.code === '23505') {
        this.logger.warn(
          `Idempotency key collision detected: ${input.providerEventId}`,
        );
        throw new ConflictException('Event already processed');
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private isPgError(
    err: unknown,
  ): err is { code?: string; constraint?: string } {
    return typeof err === 'object' && err !== null && 'code' in err;
  }
}
