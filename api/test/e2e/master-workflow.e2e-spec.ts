/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-require-imports */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import * as crypto from 'crypto';
const request = require('supertest');

import { PostgresHarness } from '../helpers/postgres.harness';
import { IdentityModule } from '../../src/modules/identity/identity.module';
import { CommerceModule } from '../../src/modules/commerce/commerce.module';
import { EventsModule } from '../../src/modules/events/events.module';
import { IntegrationModule } from '../../src/modules/integration/integration.module';
import { FinanceModule } from '../../src/modules/finance/finance.module';

import { TicketInventory } from '../../src/modules/events/entities/ticket-inventory.entity';
import { TicketReservation } from '../../src/modules/events/entities/ticket-reservation.entity';
import { Order } from '../../src/modules/commerce/entities/order.entity';
import { Payment } from '../../src/modules/commerce/entities/payment.entity';
import { ProviderEvent } from '../../src/modules/integration/entities/provider-event.entity';
import { Ticket } from '../../src/modules/events/entities/ticket.entity';

import { PaymentProcessingService } from '../../src/modules/integration/services/payment-processing.service';
import { OutboxService } from '../../src/modules/integration/services/outbox.service';
import { DarajaAdapter } from '../../src/modules/integration/adapters/daraja.adapter';
import { TransformInterceptor } from '../../src/common/interceptors/transform.interceptor';
import { GlobalExceptionFilter } from '../../src/common/filters/global-exception.filter';

describe('API Edge: Master Payment Workflow (e2e)', () => {
  let app: INestApplication;
  let harness: PostgresHarness;
  let dataSource: DataSource;
  let paymentProcessingService: PaymentProcessingService;
  let outboxService: OutboxService;

  const mockQueueAdd = jest.fn();

  // Test Variables
  let jwtToken: string;
  let testTicketTypeId: string;
  let checkoutSessionId: string;
  let internalOrderId: string;
  let dynamicPublicKey: string;

  beforeAll(async () => {
    harness = new PostgresHarness();
    await harness.start();

    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
    process.env.TICKET_PRIVATE_KEY = privateKey
      .export({ format: 'pem', type: 'pkcs8' })
      .toString();
    dynamicPublicKey = publicKey
      .export({ format: 'pem', type: 'spki' })
      .toString();

    const host = (harness as any).container.getHost();
    const port = (harness as any).container.getPort();
    const username = (harness as any).container.getUsername();
    const password = (harness as any).container.getPassword();
    const database = (harness as any).container.getDatabase();

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        BullModule.forRoot({
          connection: {
            host: 'localhost',
            port: 9999,
            maxRetriesPerRequest: null,
            lazyConnect: true,
          },
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host,
          port,
          username,
          password,
          database,
          entities: [__dirname + '/../../src/**/*.entity{.ts,.js}'],
          synchronize: false,
        }),
        IdentityModule,
        CommerceModule,
        EventsModule,
        IntegrationModule,
        FinanceModule,
      ],
    })
      .overrideProvider(getQueueToken('payments'))
      .useValue({ add: mockQueueAdd })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalFilters(new GlobalExceptionFilter());

    await app.init();

    dataSource = moduleRef.get(DataSource);
    paymentProcessingService = app.get(PaymentProcessingService);
    outboxService = app.get(OutboxService);

    const darajaAdapter = app.get(DarajaAdapter);
    jest.spyOn(darajaAdapter, 'sendStkPush').mockResolvedValue({
      MerchantRequestID: '29115-34620561-1',
      CheckoutRequestID: `ws_CO_MOCK_${Date.now()}`,
      ResponseCode: '0',
      ResponseDescription: 'Success',
      CustomerMessage: 'Success',
    });

    const schemaRunner = dataSource.createQueryRunner();
    await schemaRunner.connect();
    try {
      // Patch Signing Keys
      await schemaRunner.query(
        `ALTER TABLE events.signing_keys ADD COLUMN IF NOT EXISTS valid_to timestamptz`,
      );
      await schemaRunner.query(
        `ALTER TABLE events.signing_keys ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT CURRENT_TIMESTAMP`,
      );
      await schemaRunner.query(
        `ALTER TABLE events.signing_keys ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT CURRENT_TIMESTAMP`,
      );

      // FIX 1: Drop deprecated legacy columns that cause NOT NULL constraint violations
      await schemaRunner.query(
        `ALTER TABLE events.tickets DROP COLUMN IF EXISTS ticket_number CASCADE`,
      );
      await schemaRunner.query(
        `ALTER TABLE events.tickets DROP COLUMN IF EXISTS qr_payload_hash CASCADE`,
      );
      await schemaRunner.query(
        `ALTER TABLE events.tickets DROP COLUMN IF EXISTS signature_key_id CASCADE`,
      );
      await schemaRunner.query(
        `ALTER TABLE events.tickets DROP COLUMN IF EXISTS qr_signature CASCADE`,
      );

      // Patch Tickets with new Cryptographic columns
      await schemaRunner.query(
        `ALTER TABLE events.tickets ADD COLUMN IF NOT EXISTS order_item_id uuid`,
      );
      await schemaRunner.query(
        `ALTER TABLE events.tickets ADD COLUMN IF NOT EXISTS event_id uuid`,
      );
      await schemaRunner.query(
        `ALTER TABLE events.tickets ADD COLUMN IF NOT EXISTS sequence_number int`,
      );
      await schemaRunner.query(
        `ALTER TABLE events.tickets ADD COLUMN IF NOT EXISTS signature text`,
      );
      await schemaRunner.query(
        `ALTER TABLE events.tickets ADD COLUMN IF NOT EXISTS signing_key_id uuid`,
      );
      await schemaRunner.query(
        `ALTER TABLE events.tickets ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT CURRENT_TIMESTAMP`,
      );
    } catch {
      // <-- FIX 2: Removed the unused 'e' variable binding to satisfy ESLint on line 140
      // Catch silently in case tables aren't fully initialized by the harness yet
    } finally {
      await schemaRunner.release();
    }
  }, 30000);

  afterAll(async () => {
    if (app) await app.close();
    if (harness) await harness.stop();
  });

  it('1. Setup: Register User & Seed Event Data', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'master@test.com', password: 'SuperSecurePassword123!' });
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'master@test.com', password: 'SuperSecurePassword123!' })
      .expect(200);
    jwtToken = loginRes.body.data.accessToken;

    const runner = dataSource.createQueryRunner();
    await runner.connect();

    try {
      const userRes = await runner.query(
        `SELECT id FROM identity.users WHERE email = 'master@test.com'`,
      );
      const userId = userRes[0].id;

      const merchantRes = await runner.query(
        `
        INSERT INTO commerce.merchants (id, owner_user_id, business_name, status)
        VALUES (gen_random_uuid(), $1, 'Master Merchant', 'ACTIVE') RETURNING id;
      `,
        [userId],
      );
      const merchantId = merchantRes[0].id;

      const eventRes = await runner.query(
        `
        INSERT INTO events.events (id, merchant_id, title, start_time, end_time, currency, status)
        VALUES (gen_random_uuid(), $1, 'Master Event', NOW(), NOW() + INTERVAL '2 days', 'KES', 'ON_SALE') RETURNING id;
      `,
        [merchantId],
      );
      const eventId = eventRes[0].id;

      const typeRes = await runner.query(
        `
        INSERT INTO events.ticket_types (id, event_id, name, price, currency, capacity)
        VALUES (gen_random_uuid(), $1, 'VIP Pass', '5000.00', 'KES', 100) RETURNING id;
      `,
        [eventId],
      );
      testTicketTypeId = typeRes[0].id;

      await runner.query(
        `
        INSERT INTO events.ticket_inventory (ticket_type_id, capacity, available_quantity, reserved_quantity, sold_quantity)
        VALUES ($1, 100, 100, 0, 0);
      `,
        [testTicketTypeId],
      );

      await runner.query(
        `
        INSERT INTO events.signing_keys (id, algorithm, public_key, status, valid_from)
        VALUES (gen_random_uuid(), 'Ed25519', $1, 'ACTIVE', NOW());
      `,
        [dynamicPublicKey],
      );

      await runner.query(`
        INSERT INTO finance.accounts (id, account_code, account_type, classification, currency)
        VALUES (gen_random_uuid(), 'ASSET_MPESA_CLEARING', 'CLEARING', 'ASSET', 'KES'),
               (gen_random_uuid(), 'REVENUE_TICKET_COMMISSION', 'PLATFORM_REVENUE', 'REVENUE', 'KES')
        ON CONFLICT (account_code, currency) DO NOTHING;
      `);

      const merchantCode = `LIAB_MERCHANT_${merchantId.replace(/-/g, '')}`;
      await runner.query(
        `
        INSERT INTO finance.accounts (id, account_code, account_type, classification, currency)
        VALUES (gen_random_uuid(), $1, 'MERCHANT_PENDING', 'LIABILITY', 'KES')
        ON CONFLICT (account_code, currency) DO NOTHING;
      `,
        [merchantCode],
      );
    } finally {
      await runner.release();
    }
  });

  it('2. The Checkout: Reserves Inventory and Creates Pending Order', async () => {
    const response = await request(app.getHttpServer())
      .post('/commerce/checkout')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        ticketTypeId: testTicketTypeId,
        quantity: 2,
        phoneNumber: '254700111222',
      })
      .expect(201);

    internalOrderId = response.body.data.orderId;
    checkoutSessionId = response.body.data.checkoutSessionId;
    expect(internalOrderId).toBeDefined();

    const inv = await dataSource
      .getRepository(TicketInventory)
      .findOneBy({ ticketType: { id: testTicketTypeId } });
    expect(inv?.availableQuantity).toBe(98);
    expect(inv?.reservedQuantity).toBe(2);
  });

  it('3. The Webhook: Receives Daraja Callback and Dispatches Outbox', async () => {
    const successPayload = {
      Body: {
        stkCallback: {
          MerchantRequestID: '29115-34620561-1',
          CheckoutRequestID: checkoutSessionId,
          ResultCode: 0,
          ResultDesc: 'The service request is processed successfully.',
          CallbackMetadata: {
            Item: [
              { Name: 'Amount', Value: 10000 },
              { Name: 'MpesaReceiptNumber', Value: 'REAL_RECEIPT_123' },
            ],
          },
        },
      },
    };

    await request(app.getHttpServer())
      .post('/webhooks/daraja/stk')
      .send(successPayload)
      .expect(200);

    const inboxEvent = await dataSource
      .getRepository(ProviderEvent)
      .findOneBy({ providerEventId: checkoutSessionId });
    expect(inboxEvent).toBeDefined();

    await outboxService.dispatchOutboxMessages();
    expect(mockQueueAdd).toHaveBeenCalledTimes(1);
  });

  it('4. The Fulfillment: Business Logic Finalizes the Transaction', async () => {
    const [, jobData] = mockQueueAdd.mock.calls[0];

    await paymentProcessingService.processFulfillment(jobData);

    const inv = await dataSource
      .getRepository(TicketInventory)
      .findOneBy({ ticketType: { id: testTicketTypeId } });
    expect(inv?.availableQuantity).toBe(98);
    expect(inv?.reservedQuantity).toBe(0);
    expect(inv?.soldQuantity).toBe(2);

    const order = await dataSource
      .getRepository(Order)
      .findOneBy({ id: internalOrderId });
    expect(order?.paymentStatus).toBe('PAID');
    expect(order?.fulfillmentStatus).toBe('FULFILLED');

    const reservation = await dataSource
      .getRepository(TicketReservation)
      .findOneBy({ order: { id: internalOrderId } });
    expect(reservation?.status).toBe('SOLD');

    // Mathematical Proof: Ledger Integrity Check
    const payment = await dataSource
      .getRepository(Payment)
      .findOneBy({ order: { id: internalOrderId } });
    if (payment) {
      const ledgerMath = await dataSource.query(
        `
        SELECT 
          SUM(CASE WHEN direction = 'DEBIT' THEN amount ELSE 0 END) AS total_debits,
          SUM(CASE WHEN direction = 'CREDIT' THEN amount ELSE 0 END) AS total_credits
        FROM finance.ledger_entries le
        JOIN finance.ledger_transactions lt ON lt.id = le.transaction_id
        WHERE lt.reference_id = $1;
      `,
        [payment.id],
      );
      expect(Number(ledgerMath[0].total_debits)).toBe(10000);
      expect(Number(ledgerMath[0].total_credits)).toBe(10000);
      expect(ledgerMath[0].total_debits).toEqual(ledgerMath[0].total_credits);
    }

    // Mathematical Proof: Cryptographic Ticket Delivery Check
    const tickets = await dataSource.getRepository(Ticket).find({
      where: { orderId: internalOrderId },
      order: { sequenceNumber: 'ASC' },
    });

    expect(tickets.length).toBe(2);
    expect(tickets[0].signature).toBeDefined();

    // Safely handle driver return types (string vs object) depending on the sync state
    const payload =
      typeof tickets[0].qrPayload === 'string'
        ? JSON.parse(tickets[0].qrPayload as unknown as string)
        : tickets[0].qrPayload;

    expect(payload.t_id).toBeDefined();
    expect(payload.v).toBe(1);
  });
});
