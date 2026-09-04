/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';

// eslint-disable-next-line @typescript-eslint/no-require-imports
import request = require('supertest');

import { AppModule } from '../../../src/app.module';
import { PostgresHarness } from '../../helpers/postgres.harness';
import { EventStatus } from '../../../src/modules/events/enums/events.enums';
import { TransformInterceptor } from '../../../src/common/interceptors/transform.interceptor';
import { GlobalExceptionFilter } from '../../../src/common/filters/global-exception.filter';
import { DarajaAdapter } from '../../../src/modules/integration/adapters/daraja.adapter';

describe('API Contract - Checkout (E2E)', () => {
  let pgHarness: PostgresHarness;
  let app: any;
  let dataSource: DataSource;
  let jwtToken: string;

  // Spies
  let sendStkPushSpy: jest.Mock;

  // Domain state
  let customerId: string;
  let eventId: string;
  let regularTicketTypeId: string;
  let scarceTicketTypeId: string;

  beforeAll(async () => {
    pgHarness = new PostgresHarness();
    await pgHarness.start();

    const harnessAny = pgHarness as any;
    const dbHost = harnessAny.container.getHost();
    const dbPort = harnessAny.container.getPort();
    const dbUser = harnessAny.container.getUsername();
    const dbPass = harnessAny.container.getPassword();
    const dbName = harnessAny.container.getDatabase();

    const adminRunner = new DataSource({
      type: 'postgres',
      host: dbHost,
      port: dbPort,
      username: dbUser,
      password: dbPass,
      database: dbName,
    });
    await adminRunner.initialize();
    await adminRunner.query(
      `DROP SCHEMA IF EXISTS events, commerce, identity, finance, integration CASCADE;`,
    );
    await adminRunner.query(
      `CREATE SCHEMA events; CREATE SCHEMA commerce; CREATE SCHEMA identity; CREATE SCHEMA finance; CREATE SCHEMA integration;`,
    );
    await adminRunner.destroy();

    const realConfig = new ConfigService();

    // Setup Spy for the Daraja Adapter
    sendStkPushSpy = jest.fn().mockResolvedValue({
      MerchantRequestID: 'mock-merchant-req',
      CheckoutRequestID: 'mock-checkout-req',
      ResponseCode: '0',
      ResponseDescription: 'Success',
      CustomerMessage: 'Success',
    });

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ConfigService)
      .useValue({
        get: <T = unknown>(key: string): T | undefined => {
          if (key === 'database') {
            return {
              type: 'postgres',
              host: dbHost,
              port: dbPort,
              username: dbUser,
              password: dbPass,
              database: dbName,
              autoLoadEntities: true,
              synchronize: true,
            } as unknown as T;
          }
          return realConfig.get<T>(key);
        },
      })
      .overrideProvider(DarajaAdapter)
      .useValue({ sendStkPush: sendStkPushSpy })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.setGlobalPrefix('api/v1');

    await app.init();
    dataSource = moduleRef.get(DataSource);

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      // Create Customer
      let resId = '';
      try {
        const res = await queryRunner.query(
          `INSERT INTO identity.users (id, email, password_hash, first_name, last_name) VALUES (gen_random_uuid(), 'fan@anime.test', 'hash', 'Test', 'Fan') RETURNING id;`,
        );
        resId = res[0].id;
      } catch {
        const res = await queryRunner.query(
          `INSERT INTO identity.users (id, email, "passwordHash", "firstName", "lastName") VALUES (gen_random_uuid(), 'fan@anime.test', 'hash', 'Test', 'Fan') RETURNING id;`,
        );
        resId = res[0].id;
      }
      customerId = resId;

      // Create Merchant
      let merchantId = '';
      try {
        const res = await queryRunner.query(
          `INSERT INTO commerce.merchants (id, owner_user_id, business_name, status) VALUES (gen_random_uuid(), $1, 'Merchant', 'ACTIVE') RETURNING id;`,
          [customerId],
        );
        merchantId = res[0].id;
      } catch {
        const res = await queryRunner.query(
          `INSERT INTO commerce.merchants (id, "ownerUserId", "businessName", status) VALUES (gen_random_uuid(), $1, 'Merchant', 'ACTIVE') RETURNING id;`,
          [customerId],
        );
        merchantId = res[0].id;
      }

      // Create Event
      try {
        const res = await queryRunner.query(
          `INSERT INTO events.events (id, merchant_id, title, start_time, end_time, currency, status) VALUES (gen_random_uuid(), $1, 'Con', NOW(), NOW() + INTERVAL '1 day', 'KES', $2) RETURNING id;`,
          [merchantId, EventStatus.ON_SALE],
        );
        eventId = res[0].id;
      } catch {
        const res = await queryRunner.query(
          `INSERT INTO events.events (id, "merchantId", title, "startTime", "endTime", currency, status) VALUES (gen_random_uuid(), $1, 'Con', NOW(), NOW() + INTERVAL '1 day', 'KES', $2) RETURNING id;`,
          [merchantId, EventStatus.ON_SALE],
        );
        eventId = res[0].id;
      }

      // Ticket Type A: Plenty of stock (Price: 1500)
      try {
        const res = await queryRunner.query(
          `INSERT INTO events.ticket_types (id, event_id, name, price, currency, capacity) VALUES (gen_random_uuid(), $1, 'GA', '1500.00', 'KES', 500) RETURNING id;`,
          [eventId],
        );
        regularTicketTypeId = res[0].id;
        await queryRunner.query(
          `INSERT INTO events.ticket_inventory (ticket_type_id, capacity, available_quantity, reserved_quantity, sold_quantity, version) VALUES ($1, 500, 500, 0, 0, 1);`,
          [regularTicketTypeId],
        );
      } catch {
        const res = await queryRunner.query(
          `INSERT INTO events.ticket_types (id, "eventId", name, price, currency, capacity) VALUES (gen_random_uuid(), $1, 'GA', '1500.00', 'KES', 500) RETURNING id;`,
          [eventId],
        );
        regularTicketTypeId = res[0].id;
        await queryRunner.query(
          `INSERT INTO events.ticket_inventory ("ticketTypeId", capacity, "availableQuantity", "reservedQuantity", "soldQuantity", version) VALUES ($1, 500, 500, 0, 0, 1);`,
          [regularTicketTypeId],
        );
      }

      // Ticket Type B: Only 1 ticket left
      try {
        const res = await queryRunner.query(
          `INSERT INTO events.ticket_types (id, event_id, name, price, currency, capacity) VALUES (gen_random_uuid(), $1, 'VIP', '5000.00', 'KES', 1) RETURNING id;`,
          [eventId],
        );
        scarceTicketTypeId = res[0].id;
        await queryRunner.query(
          `INSERT INTO events.ticket_inventory (ticket_type_id, capacity, available_quantity, reserved_quantity, sold_quantity, version) VALUES ($1, 1, 1, 0, 0, 1);`,
          [scarceTicketTypeId],
        );
      } catch {
        const res = await queryRunner.query(
          `INSERT INTO events.ticket_types (id, "eventId", name, price, currency, capacity) VALUES (gen_random_uuid(), $1, 'VIP', '5000.00', 'KES', 1) RETURNING id;`,
          [eventId],
        );
        scarceTicketTypeId = res[0].id;
        await queryRunner.query(
          `INSERT INTO events.ticket_inventory ("ticketTypeId", capacity, "availableQuantity", "reservedQuantity", "soldQuantity", version) VALUES ($1, 1, 1, 0, 0, 1);`,
          [scarceTicketTypeId],
        );
      }
    } finally {
      await queryRunner.release();
    }

    // Generate valid Auth Token
    const jwtService = moduleRef.get(JwtService);
    jwtToken = jwtService.sign({ sub: customerId, email: 'fan@anime.test' });
  }, 60000);

  afterAll(async () => {
    if (app) await app.close();
    if (pgHarness) await pgHarness.stop();
  });

  beforeEach(() => {
    sendStkPushSpy.mockClear();
  });

  it('1. Rejects unauthenticated request (401)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/checkout`)
      .send({
        ticketTypeId: regularTicketTypeId,
        quantity: 1,
        phoneNumber: '0712345678',
      });

    expect(res.status).toBe(401);
  });

  it('2. Rejects request with invalid phone (400 - Zod)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/checkout`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        ticketTypeId: regularTicketTypeId,
        quantity: 1,
        phoneNumber: 'invalid-phone-string',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Validation failed');
  });

  it('3. Rejects invalid quantities (400 - Zod)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/checkout`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        ticketTypeId: regularTicketTypeId,
        quantity: -5,
        phoneNumber: '0712345678',
      });

    expect(res.status).toBe(400);
  });

  it('4. Outright rejects price spoofing attempts (400 - Zod Strict)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/checkout`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        ticketTypeId: regularTicketTypeId,
        quantity: 2,
        phoneNumber: '0712345678',
        price: '1.00', // <-- Attempt to buy 2 tickets for 1 KES
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Validation failed');
  });

  it('5. Successfully executes checkout with server-derived pricing (201)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/checkout`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        ticketTypeId: regularTicketTypeId,
        quantity: 2,
        phoneNumber: '0712345678',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('PENDING');

    // Server derives exactly 3000.00 KES (1500 * 2)
    expect(res.body.data.amount).toBe('3000.0000');
    expect(res.body.data.currency).toBe('KES');
    expect(res.body.data.orderId).toBeDefined();

    // Verify STK push was triggered with correct derived data
    expect(sendStkPushSpy).toHaveBeenCalledTimes(1);
    expect(sendStkPushSpy).toHaveBeenCalledWith(
      '254712345678', // Properly normalized to international format
      3000, // Number cast of amount
      res.body.data.orderId,
    );
  });

  it('6. Safely handles insufficient inventory conflicts concurrently', async () => {
    // Only 1 VIP ticket left. Fire 2 requests at the exact same time.
    const promises = [
      request(app.getHttpServer())
        .post(`/api/v1/checkout`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          ticketTypeId: scarceTicketTypeId,
          quantity: 1,
          phoneNumber: '0712345678',
        }),
      request(app.getHttpServer())
        .post(`/api/v1/checkout`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          ticketTypeId: scarceTicketTypeId,
          quantity: 1,
          phoneNumber: '0712345678',
        }),
    ];

    const [res1, res2] = await Promise.all(promises);

    // Because of Postgres pessimistic locking in the CheckoutService,
    // exactly one request will succeed (201), and one will fail with 409 Conflict.
    const statuses = [res1.status, res2.status].sort();

    expect(statuses[0]).toBe(201); // Winner gets the ticket
    expect(statuses[1]).toBe(409); // Loser gets bounced immediately

    expect(sendStkPushSpy).toHaveBeenCalledTimes(1); // Only 1 push sent
  });
});
