/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';

// FIX: Tell ESLint to explicitly allow this CommonJS import for SuperTest
// eslint-disable-next-line @typescript-eslint/no-require-imports
import request = require('supertest');

import { AppModule } from '../../../src/app.module';
import { PostgresHarness } from '../../helpers/postgres.harness';
import {
  EventStatus,
  KeyStatus,
  TicketStatus,
} from '../../../src/modules/events/enums/events.enums';
import { TicketWalletListResponseSchema } from '../../../src/modules/events/dto/ticket-wallet.dto';
import { TransformInterceptor } from '../../../src/common/interceptors/transform.interceptor';
import { GlobalExceptionFilter } from '../../../src/common/filters/global-exception.filter';

describe('API Contract - Ticket Wallet (E2E)', () => {
  let pgHarness: PostgresHarness;
  let app: any;
  let dataSource: DataSource;
  let jwtService: JwtService;

  // Domain state
  let customerAToken: string;
  let customerBToken: string;
  let customerATicketId: string;
  let customerBTicketId: string;

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
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.setGlobalPrefix('api/v1');

    await app.init();
    dataSource = moduleRef.get(DataSource);
    jwtService = moduleRef.get(JwtService);

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      // Create Two Distinct Customers
      const userARes = await queryRunner.query(
        `INSERT INTO identity.users (id, email, password_hash) VALUES (gen_random_uuid(), 'alice@anime.test', 'hash') RETURNING id;`,
      );
      const customerAId = userARes[0].id;
      customerAToken = jwtService.sign({
        sub: customerAId,
        email: 'alice@anime.test',
      });

      const userBRes = await queryRunner.query(
        `INSERT INTO identity.users (id, email, password_hash) VALUES (gen_random_uuid(), 'bob@anime.test', 'hash') RETURNING id;`,
      );
      const customerBId = userBRes[0].id;
      customerBToken = jwtService.sign({
        sub: customerBId,
        email: 'bob@anime.test',
      });

      // Create Shared Event Data
      const merchantRes = await queryRunner.query(
        `INSERT INTO commerce.merchants (id, owner_user_id, business_name, status) VALUES (gen_random_uuid(), $1, 'Merchant', 'ACTIVE') RETURNING id;`,
        [customerAId],
      );
      const merchantId = merchantRes[0].id;

      const eventRes = await queryRunner.query(
        `INSERT INTO events.events (id, merchant_id, title, start_time, end_time, currency, status) VALUES (gen_random_uuid(), $1, 'Con', NOW(), NOW() + INTERVAL '1 day', 'KES', $2) RETURNING id;`,
        [merchantId, EventStatus.PUBLISHED],
      );
      const eventId = eventRes[0].id;

      const typeRes = await queryRunner.query(
        `INSERT INTO events.ticket_types (id, event_id, name, price, currency, capacity) VALUES (gen_random_uuid(), $1, 'GA', '1000.00', 'KES', 500) RETURNING id;`,
        [eventId],
      );
      const typeId = typeRes[0].id;

      const keyRes = await queryRunner.query(
        `INSERT INTO events.signing_keys (id, algorithm, public_key, status, valid_from) VALUES (gen_random_uuid(), 'Ed25519', 'pub_key', $1, NOW()) RETURNING id;`,
        [KeyStatus.ACTIVE],
      );
      const keyId = keyRes[0].id;

      // Seed Customer A's Ticket
      const orderARes = await queryRunner.query(
        `INSERT INTO commerce.orders (id, order_number, customer_id, merchant_id, gross_amount, currency, payment_status) VALUES (gen_random_uuid(), 'ORD-A', $1, $2, '1000.0000', 'KES', 'PAID') RETURNING id;`,
        [customerAId, merchantId],
      );
      const ticketARes = await queryRunner.query(
        `INSERT INTO events.tickets (id, order_id, order_item_id, event_id, ticket_type_id, sequence_number, status, signing_key_id, qr_payload, signature) VALUES (gen_random_uuid(), $1, gen_random_uuid(), $2, $3, 1, $4, $5, '{"t_id":"A"}', 'sigA') RETURNING id;`,
        [orderARes[0].id, eventId, typeId, TicketStatus.ISSUED, keyId],
      );
      customerATicketId = ticketARes[0].id;

      // Seed Customer B's Ticket
      const orderBRes = await queryRunner.query(
        `INSERT INTO commerce.orders (id, order_number, customer_id, merchant_id, gross_amount, currency, payment_status) VALUES (gen_random_uuid(), 'ORD-B', $1, $2, '1000.0000', 'KES', 'PAID') RETURNING id;`,
        [customerBId, merchantId],
      );
      const ticketBRes = await queryRunner.query(
        `INSERT INTO events.tickets (id, order_id, order_item_id, event_id, ticket_type_id, sequence_number, status, signing_key_id, qr_payload, signature) VALUES (gen_random_uuid(), $1, gen_random_uuid(), $2, $3, 2, $4, $5, '{"t_id":"B"}', 'sigB') RETURNING id;`,
        [orderBRes[0].id, eventId, typeId, TicketStatus.ISSUED, keyId],
      );
      customerBTicketId = ticketBRes[0].id;
    } finally {
      await queryRunner.release();
    }
  }, 60000);

  afterAll(async () => {
    if (app) await app.close();
    if (pgHarness) await pgHarness.stop();
  });

  it('1. Rejects unauthenticated requests (401)', async () => {
    const res = await request(app.getHttpServer()).get(
      `/api/v1/tickets/wallet`,
    );
    expect(res.status).toBe(401);
  });

  it('2. Customer A sees exactly 1 ticket, and it matches the Zod API Contract', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/tickets/wallet`)
      .set('Authorization', `Bearer ${customerAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    expect(data.tickets.length).toBe(1);
    expect(data.tickets[0].id).toBe(customerATicketId);

    // PROOF OF CONTRACT: The frontend Zod schema successfully parses the server's output
    expect(() => TicketWalletListResponseSchema.parse(data)).not.toThrow();
  });

  it('3. Customer B sees exactly 1 ticket, maintaining strict isolation', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/tickets/wallet`)
      .set('Authorization', `Bearer ${customerBToken}`);

    expect(res.status).toBe(200);

    const data = res.body.data;
    expect(data.tickets.length).toBe(1);
    expect(data.tickets[0].id).toBe(customerBTicketId); // Bob does not see Alice's ticket
  });
});
