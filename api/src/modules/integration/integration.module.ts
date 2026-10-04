import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';

import { FinanceModule } from '../finance/finance.module';
import { EventsModule } from '../events/events.module';

import { ProviderTransaction } from './entities/provider-transaction.entity';
import { ProviderEvent } from './entities/provider-event.entity';
import { ProviderEventProcessing } from './entities/provider-event-processing.entity';
import { OutboxMessage } from './entities/outbox-message.entity';
import { StatementImport } from './entities/statement-import.entity';
import { StatementLine } from './entities/statement-line.entity';
import { ReconciliationCase } from './entities/reconciliation-case.entity';
import { ReconciliationMatch } from './entities/reconciliation-match.entity';

import { WebhookService } from './services/webhook.service';
import { OutboxService } from './services/outbox.service';
import { ReconciliationService } from './services/reconciliation.service';
import { MpesaService } from './services/mpesa.service';
import { PaymentProcessingService } from './services/payment-processing.service';
import { EmailService } from './services/email.service'; // <-- ADDED

import { WebhookController } from './controllers/webhook.controller';
import { DarajaAdapter } from './adapters/daraja.adapter';
import { EmailProcessor } from './processors/email.processor'; // <-- ADDED

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProviderTransaction,
      ProviderEvent,
      ProviderEventProcessing,
      OutboxMessage,
      StatementImport,
      StatementLine,
      ReconciliationCase,
      ReconciliationMatch,
    ]),
    // FIX: Register ALL queues here so the Central OutboxService can inject them
    BullModule.registerQueue(
      { name: 'payments' },
      { name: 'ticket-delivery' },
      { name: 'email-queue' }, // <-- ADDED
    ),
    FinanceModule,
    EventsModule,
  ],
  controllers: [WebhookController],
  providers: [
    WebhookService,
    OutboxService,
    ReconciliationService,
    MpesaService,
    DarajaAdapter,
    PaymentProcessingService,
    EmailService, // <-- ADDED
    EmailProcessor, // <-- ADDED
  ],
  exports: [
    WebhookService,
    OutboxService,
    ReconciliationService,
    MpesaService,
    PaymentProcessingService,
    EmailService,
  ],
})
export class IntegrationModule {}
