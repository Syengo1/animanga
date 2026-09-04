/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { DataSource } from 'typeorm';
import { ConfigModule } from '@nestjs/config';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import * as crypto from 'crypto';

import { PostgresHarness } from '../../helpers/postgres.harness';

import { EventsModule } from '../../../src/modules/events/events.module';
import { IdentityModule } from '../../../src/modules/identity/identity.module';
import { CommerceModule } from '../../../src/modules/commerce/commerce.module';

import { EventsOutboxDispatcherService } from '../../../src/modules/events/services/events-outbox-dispatcher.service';
import { MockEmailAdapter } from '../../../src/modules/events/adapters/notification.adapter';

import { TicketDelivery } from '../../../src/modules/events/entities/ticket-delivery.entity';
import { OutboxMessage } from '../../../src/modules/integration/entities/outbox-message.entity';
import {
  EventStatus,
  KeyStatus,
  TicketStatus,
  DeliveryStatus,
} from '../../../src/modules/events/enums/events.enums';
import { OutboxStatus } from '../../../src/modules/integration/enums/integration.enums';

describe('Events Domain - Ticket Delivery Pipeline (E2E)', () => {
  let pgHarness: PostgresHarness;
  let redisContainer: StartedTestContainer;
  let moduleRef: TestingModule;
  let dataSource: DataSource;
  let dispatcher: EventsOutboxDispatcherService;
  let emailAdapter: MockEmailAdapter;

  // Shared Context
  let customerUserId: string;
  let merchantId: string;
  let ticketId: string;
  let outboxMessageId: string;

  beforeAll(async () => {
    // 1. Boot Postgres
    pgHarness = new PostgresHarness();
    await pgHarness.start();
    const pgHost = (pgHarness as any).container.getHost();
    const pgPort = (pgHarness as any).container.getPort();
    const username = (pgHarness as any).container.getUsername();
    const password = (pgHarness as any).container.getPassword();
    const database = (pgHarness as any).container.getDatabase();

    // 2. Boot Redis for BullMQ
    redisContainer = await new GenericContainer('redis:7-alpine')
      .withExposedPorts(6379)
      .start();
    const redisHost = redisContainer.getHost();
    const redisPort = redisContainer.getMappedPort(6379);

    // Defensively nuke and recreate schemas
    const adminRunner = new DataSource({
      type: 'postgres',
      host: pgHost,
      port: pgPort,
      username,
      password,
      database,
    });
    await adminRunner.initialize();
    await adminRunner.query(`DROP SCHEMA IF EXISTS events CASCADE;`);
    await adminRunner.query(`DROP SCHEMA IF EXISTS commerce CASCADE;`);
    await adminRunner.query(`DROP SCHEMA IF EXISTS identity CASCADE;`);
    await adminRunner.query(`DROP SCHEMA IF EXISTS finance CASCADE;`);
    await adminRunner.query(`DROP SCHEMA IF EXISTS integration CASCADE;`);
    await adminRunner.query(`CREATE SCHEMA events;`);
    await adminRunner.query(`CREATE SCHEMA commerce;`);
    await adminRunner.query(`CREATE SCHEMA identity;`);
    await adminRunner.query(`CREATE SCHEMA finance;`);
    await adminRunner.query(`CREATE SCHEMA integration;`);
    await adminRunner.destroy();

    // 3. Compile Testing Module
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: pgHost,
          port: pgPort,
          username,
          password,
          database,
          autoLoadEntities: true,
          synchronize: true,
        }),
        BullModule.forRoot({
          connection: {
            host: redisHost,
            port: redisPort,
          },
        }),
        IdentityModule,
        CommerceModule,
        EventsModule,
      ],
    }).compile();

    // Start application context so workers and crons boot up
    const app = moduleRef.createNestApplication();
    await app.init();

    dataSource = moduleRef.get(DataSource);
    dispatcher = moduleRef.get(EventsOutboxDispatcherService);
    emailAdapter = moduleRef.get(MockEmailAdapter);

    // 4. Seed the Database
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      const userRes = await queryRunner.query(`
        INSERT INTO identity.users (id, email, password_hash, first_name, last_name)
        VALUES (gen_random_uuid(), 'e2e@anime.test', 'hash', 'Test', 'Customer') RETURNING id;
      `);
      customerUserId = userRes[0].id;

      const merchantRes = await queryRunner.query(
        `
        INSERT INTO commerce.merchants (id, owner_user_id, business_name, status)
        VALUES (gen_random_uuid(), $1, 'Merchant', 'ACTIVE') RETURNING id;
      `,
        [customerUserId],
      );
      merchantId = merchantRes[0].id;

      const eventRes = await queryRunner.query(
        `
        INSERT INTO events.events (id, merchant_id, title, start_time, end_time, currency, status)
        VALUES (gen_random_uuid(), $1, 'E2E Test Event', NOW(), NOW() + INTERVAL '1 day', 'KES', $2) RETURNING id;
      `,
        [merchantId, EventStatus.PUBLISHED],
      );
      const eventId = eventRes[0].id;

      const typeRes = await queryRunner.query(
        `
        INSERT INTO events.ticket_types (id, event_id, name, price, currency, capacity)
        VALUES (gen_random_uuid(), $1, 'GA', '1000.00', 'KES', 500) RETURNING id;
      `,
        [eventId],
      );
      const ticketTypeId = typeRes[0].id;

      const { publicKey } = crypto.generateKeyPairSync('ed25519');
      const keyRes = await queryRunner.query(
        `
        INSERT INTO events.signing_keys (id, algorithm, public_key, status, valid_from)
        VALUES (gen_random_uuid(), 'Ed25519', $1, $2, NOW()) RETURNING id;
      `,
        [
          publicKey.export({ format: 'pem', type: 'spki' }).toString(),
          KeyStatus.ACTIVE,
        ],
      );

      const orderRes = await queryRunner.query(
        `
        INSERT INTO commerce.orders (id, order_number, customer_id, merchant_id, gross_amount, currency, payment_status)
        VALUES (gen_random_uuid(), 'ORD-E2E', $1, $2, '1000.0000', 'KES', 'PAID') RETURNING id;
      `,
        [customerUserId, merchantId],
      );
      const orderId = orderRes[0].id;

      const ticketRes = await queryRunner.query(
        `
        INSERT INTO events.tickets (id, order_id, order_item_id, event_id, ticket_type_id, sequence_number, status, signing_key_id, qr_payload, signature)
        VALUES (gen_random_uuid(), $1, gen_random_uuid(), $2, $3, 1, $4, $5, $6, $7) RETURNING id;
      `,
        [
          orderId,
          eventId,
          ticketTypeId,
          TicketStatus.ISSUED,
          keyRes[0].id,
          '{}',
          'sig',
        ],
      );
      ticketId = ticketRes[0].id;

      const outboxRes = await queryRunner.query(
        `
        INSERT INTO integration.outbox_messages (id, aggregate_type, aggregate_id, event_type, payload, deduplication_key, status, next_attempt_at)
        VALUES (gen_random_uuid(), 'Ticket', $1, 'TICKET_DELIVERY_REQUESTED', $2, $3, $4, NOW()) RETURNING id;
      `,
        [
          ticketId,
          JSON.stringify({ ticketId, orderId }),
          `TICKET:${ticketId}:DELIVERY:EMAIL:v1`,
          OutboxStatus.PENDING,
        ],
      );
      outboxMessageId = outboxRes[0].id;
    } finally {
      await queryRunner.release();
    }
  }, 45000); // Allow time for pulling Redis image if needed

  afterAll(async () => {
    if (moduleRef) await moduleRef.close();
    if (pgHarness) await pgHarness.stop();
    if (redisContainer) await redisContainer.stop();
  });

  // Helper to wait for background processing
  async function waitForDelivery(
    ticketId: string,
    maxWaitMs = 5000,
  ): Promise<TicketDelivery | null> {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      const delivery = await dataSource
        .getRepository(TicketDelivery)
        .findOneBy({ ticketId });
      if (delivery && delivery.status === DeliveryStatus.SENT) return delivery;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    return null;
  }

  it('Successfully dispatches, queues, processes, and delivers a ticket asynchronously', async () => {
    const spy = jest.spyOn(emailAdapter, 'sendTicket');

    // 1. Manually trigger the CRON dispatcher to grab the pending message
    await dispatcher.dispatchTicketDeliveries();

    // 2. Dispatcher should have marked it as PROCESSING and sent it to BullMQ
    const processingOutbox = await dataSource
      .getRepository(OutboxMessage)
      .findOneBy({ id: outboxMessageId });
    expect(processingOutbox?.status).toBe(OutboxStatus.PROCESSING);

    // 3. Wait for the BullMQ Worker to pick it up and process it
    const delivery = await waitForDelivery(ticketId);

    // 4. Assert the final states
    expect(delivery).not.toBeNull();
    expect(delivery?.status).toBe(DeliveryStatus.SENT);
    expect(delivery?.attemptCount).toBe(1);

    const publishedOutbox = await dataSource
      .getRepository(OutboxMessage)
      .findOneBy({ id: outboxMessageId });
    expect(publishedOutbox?.status).toBe(OutboxStatus.PUBLISHED);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        ticketId,
        destination: 'e2e@anime.test',
      }),
    );
  }, 10000);
});
