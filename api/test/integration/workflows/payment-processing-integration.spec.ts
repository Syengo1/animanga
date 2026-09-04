/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConfigModule } from '@nestjs/config';
import * as crypto from 'crypto';

import { PostgresHarness } from '../../helpers/postgres.harness';
import { IntegrationModule } from '../../../src/modules/integration/integration.module';
import { CommerceModule } from '../../../src/modules/commerce/commerce.module';
import { EventsModule } from '../../../src/modules/events/events.module';
import { IdentityModule } from '../../../src/modules/identity/identity.module';
import { FinanceModule } from '../../../src/modules/finance/finance.module';

import { PaymentProcessingService } from '../../../src/modules/integration/services/payment-processing.service';
import { ProviderEvent } from '../../../src/modules/integration/entities/provider-event.entity';
import {
  ProviderEventProcessing,
  ProviderEventProcessingStatus,
} from '../../../src/modules/integration/entities/provider-event-processing.entity';
import { ProviderTransaction } from '../../../src/modules/integration/entities/provider-transaction.entity';
import { Payment } from '../../../src/modules/commerce/entities/payment.entity';
import { Order } from '../../../src/modules/commerce/entities/order.entity';
import { TicketInventory } from '../../../src/modules/events/entities/ticket-inventory.entity';
import { TicketReservation } from '../../../src/modules/events/entities/ticket-reservation.entity';

import { ProviderTxStatus } from '../../../src/modules/integration/enums/integration.enums';
import {
  PaymentStatus,
  PaymentMethod,
  OrderPaymentStatus,
  FulfillmentStatus,
} from '../../../src/modules/commerce/enums/commerce.enums';
import {
  ReservationStatus,
  EventStatus,
} from '../../../src/modules/events/enums/events.enums';
import type { PaymentJobData } from '../../../src/modules/integration/dto/payment-job.dto';

describe('Integration Core: Payment Processing Workflow', () => {
  let harness: PostgresHarness;
  let dataSource: DataSource;
  let moduleRef: TestingModule;
  let paymentProcessingService: PaymentProcessingService;

  const VALID_HASH = 'a'.repeat(64);
  const seedMerchantId = crypto.randomUUID();
  let seedTicketTypeId: string;
  let seedOrderId: string;
  let seedPaymentId: string;
  let seedProviderTxId: string;
  let seedProviderEventId: string;
  const darajaCheckoutRequestId = `ws_CO_${Date.now()}`;
  const mpesaReceiptNumber = 'UHQ81ABCD';

  beforeAll(async () => {
    harness = new PostgresHarness();
    await harness.start();

    const host = (harness as any).container.getHost();
    const port = (harness as any).container.getPort();
    const username = (harness as any).container.getUsername();
    const password = (harness as any).container.getPassword();
    const database = (harness as any).container.getDatabase();

    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host,
          port,
          username,
          password,
          database,
          entities: [__dirname + '/../../../src/**/*.entity{.ts,.js}'],
          synchronize: false, // Strict reliance on schema migration
        }),
        IdentityModule,
        CommerceModule,
        EventsModule,
        IntegrationModule,
        FinanceModule,
      ],
    }).compile();

    dataSource = moduleRef.get(DataSource);
    paymentProcessingService = moduleRef.get(PaymentProcessingService);

    await seedDatabase();
  }, 30000);

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) await dataSource.destroy();
    if (moduleRef) await moduleRef.close();
    if (harness) await harness.stop();
  });

  async function seedDatabase() {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const expectedCode = `LIAB_MERCHANT_${seedMerchantId.replace(/-/g, '')}`;
      await queryRunner.query(
        `
         INSERT INTO finance.accounts (id, account_code, account_type, classification, currency)
         VALUES 
         (gen_random_uuid(), $1, 'MERCHANT_PENDING', 'LIABILITY', 'KES'),
         (gen_random_uuid(), 'ASSET_MPESA_CLEARING', 'CLEARING', 'ASSET', 'KES'),
         (gen_random_uuid(), 'REVENUE_TICKET_COMMISSION', 'PLATFORM_REVENUE', 'REVENUE', 'KES');
      `,
        [expectedCode],
      );

      const userRes = await queryRunner.query(`
         INSERT INTO identity.users (id, email, password_hash)
         VALUES (gen_random_uuid(), 'testmerchant@animanga.com', 'hash')
         RETURNING id;
      `);
      const userId = userRes[0].id;

      await queryRunner.query(
        `
         INSERT INTO commerce.merchants (id, owner_user_id, business_name, status)
         VALUES ($1, $2, 'Animanga Vendor', 'ACTIVE');
      `,
        [seedMerchantId, userId],
      );

      const eventRes = await queryRunner.query(
        `
         INSERT INTO events.events (id, merchant_id, title, start_time, end_time, currency, status)
         VALUES (gen_random_uuid(), $1, 'Test Expo', NOW(), NOW() + INTERVAL '2 days', 'KES', '${EventStatus.ON_SALE}')
         RETURNING id;
      `,
        [seedMerchantId],
      );
      const eventId = eventRes[0].id;

      const ticketTypeRes = await queryRunner.query(
        `
         INSERT INTO events.ticket_types (id, event_id, name, price, currency, capacity)
         VALUES (gen_random_uuid(), $1, 'Standard Pass', '5000.00', 'KES', 100)
         RETURNING id;
      `,
        [eventId],
      );
      seedTicketTypeId = ticketTypeRes[0].id;

      await queryRunner.query(
        `
         INSERT INTO events.ticket_inventory (ticket_type_id, capacity, available_quantity, reserved_quantity, sold_quantity)
         VALUES ($1, 100, 98, 2, 0);
      `,
        [seedTicketTypeId],
      );

      const orderRes = await queryRunner.query(
        `
         INSERT INTO commerce.orders (id, order_number, customer_id, merchant_id, gross_amount, currency, payment_status, fulfillment_status)
         VALUES (gen_random_uuid(), 'ORD-123', $1, $2, '10000.00', 'KES', '${OrderPaymentStatus.UNPAID}', '${FulfillmentStatus.UNFULFILLED}')
         RETURNING id;
      `,
        [userId, seedMerchantId],
      );
      seedOrderId = orderRes[0].id;

      await queryRunner.query(
        `
         INSERT INTO events.ticket_reservations (id, checkout_session_id, order_id, ticket_type_id, quantity, status, expires_at)
         VALUES (gen_random_uuid(), gen_random_uuid(), $1, $2, 2, '${ReservationStatus.RESERVED}', NOW() + INTERVAL '15 minutes');
      `,
        [seedOrderId, seedTicketTypeId],
      );

      const paymentRes = await queryRunner.query(
        `
         INSERT INTO commerce.payments (id, order_id, amount, currency, status, payment_method, provider)
         VALUES (gen_random_uuid(), $1, '10000.00', 'KES', '${PaymentStatus.PENDING}', '${PaymentMethod.MPESA_STK}', 'DARAJA')
         RETURNING id;
      `,
        [seedOrderId],
      );
      seedPaymentId = paymentRes[0].id;

      const providerTxRes = await queryRunner.query(
        `
         INSERT INTO integration.provider_transactions (id, provider, provider_transaction_id, internal_payment_id, amount, currency, status)
         VALUES (gen_random_uuid(), 'DARAJA', $1, $2, '10000.00', 'KES', '${ProviderTxStatus.INITIATED}')
         RETURNING id;
      `,
        [darajaCheckoutRequestId, seedPaymentId],
      );
      seedProviderTxId = providerTxRes[0].id;

      // FIX: Insert Immutable Event (NO status column!)
      const eventPayload = await queryRunner.query(
        `
         INSERT INTO integration.provider_events (id, provider, provider_event_id, provider_transaction_id, event_type, idempotency_key, payload_hash, raw_payload)
         VALUES (gen_random_uuid(), 'DARAJA', $1, $2, 'PAYMENT_SUCCESS', $1, $3, '{}')
         RETURNING id;
      `,
        [darajaCheckoutRequestId, seedProviderTxId, VALID_HASH],
      );
      seedProviderEventId = eventPayload[0].id;

      // FIX: Insert Mutable Processing State
      await queryRunner.query(
        `
         INSERT INTO integration.provider_event_processing (provider_event_id, status)
         VALUES ($1, '${ProviderEventProcessingStatus.PENDING}');
        `,
        [seedProviderEventId],
      );
    } finally {
      await queryRunner.release();
    }
  }

  it('should traverse the entity chain and atomically fulfill the order while balancing the ledger', async () => {
    const jobData: PaymentJobData = {
      providerEventId: seedProviderEventId,
      provider: 'DARAJA',
      eventType: 'PAYMENT_SUCCESS',
      internalReferenceId: darajaCheckoutRequestId,
      providerTransactionId: mpesaReceiptNumber,
      amount: '10000.00',
      currency: 'KES',
    };

    await paymentProcessingService.processFulfillment(jobData);

    // 1. Integration Integrity
    const inbox = await dataSource
      .getRepository(ProviderEvent)
      .findOneBy({ id: seedProviderEventId });

    const processing = await dataSource
      .getRepository(ProviderEventProcessing)
      .findOneBy({ providerEventId: seedProviderEventId });

    const pTx = await dataSource
      .getRepository(ProviderTransaction)
      .findOneBy({ id: seedProviderTxId });

    // FIX: Assert the immutable event exists, and the mutable processing record is PROCESSED
    expect(inbox).toBeDefined();
    expect(processing?.status).toBe(ProviderEventProcessingStatus.PROCESSED);
    expect(pTx?.status).toBe(ProviderTxStatus.COMPLETED);

    expect(pTx?.providerTransactionId).toBe(mpesaReceiptNumber);

    // 2. Commerce & Events Integrity
    const payment = await dataSource
      .getRepository(Payment)
      .findOneBy({ id: seedPaymentId });
    const order = await dataSource
      .getRepository(Order)
      .findOneBy({ id: seedOrderId });
    const inv = await dataSource
      .getRepository(TicketInventory)
      .findOneBy({ ticketType: { id: seedTicketTypeId } });
    const reservation = await dataSource
      .getRepository(TicketReservation)
      .findOneBy({ order: { id: seedOrderId } });

    expect(payment?.status).toBe(PaymentStatus.COMPLETED);
    expect(order?.paymentStatus).toBe(OrderPaymentStatus.PAID);
    expect(order?.fulfillmentStatus).toBe(FulfillmentStatus.FULFILLED);
    expect(inv?.availableQuantity).toBe(98);
    expect(inv?.reservedQuantity).toBe(0);
    expect(inv?.soldQuantity).toBe(2);
    expect(reservation?.status).toBe(ReservationStatus.SOLD);

    // 3. Absolute Financial Mathematics
    const ledgerMath = await dataSource.query(
      `
      SELECT 
        SUM(CASE WHEN direction = 'DEBIT' THEN amount ELSE 0 END) AS total_debits,
        SUM(CASE WHEN direction = 'CREDIT' THEN amount ELSE 0 END) AS total_credits
      FROM finance.ledger_entries le
      JOIN finance.ledger_transactions lt ON lt.id = le.transaction_id
      WHERE lt.reference_id = $1;
    `,
      [seedPaymentId],
    );

    expect(Number(ledgerMath[0].total_debits)).toBe(10000);
    expect(Number(ledgerMath[0].total_credits)).toBe(10000);
    expect(ledgerMath[0].total_debits).toEqual(ledgerMath[0].total_credits);
  });
});
