/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConfigModule } from '@nestjs/config';
import * as crypto from 'crypto';

import { PostgresHarness } from '../../helpers/postgres.harness';

import { EventsModule } from '../../../src/modules/events/events.module';
import { IdentityModule } from '../../../src/modules/identity/identity.module';
import { CommerceModule } from '../../../src/modules/commerce/commerce.module';

import { TicketDeliveryService } from '../../../src/modules/events/services/ticket-delivery.service';
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

describe('Events Domain - Ticket Delivery Idempotency', () => {
  let harness: PostgresHarness;
  let moduleRef: TestingModule;
  let dataSource: DataSource;
  let deliveryService: TicketDeliveryService;
  let emailAdapter: MockEmailAdapter;

  // Shared Domain Context
  let customerUserId: string;
  let merchantId: string;
  let eventId: string;
  let ticketTypeId: string;
  let keyId: string;

  beforeAll(async () => {
    harness = new PostgresHarness();
    await harness.start();

    const host = (harness as any).container.getHost();
    const port = (harness as any).container.getPort();
    const username = (harness as any).container.getUsername();
    const password = (harness as any).container.getPassword();
    const database = (harness as any).container.getDatabase();

    // Defensively nuke and recreate schemas
    const adminRunner = new DataSource({
      type: 'postgres',
      host,
      port,
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
          autoLoadEntities: true,
          synchronize: true,
          poolSize: 50,
        }),
        IdentityModule,
        CommerceModule,
        EventsModule,
      ],
    }).compile();

    dataSource = moduleRef.get(DataSource);
    deliveryService = moduleRef.get(TicketDeliveryService);
    emailAdapter = moduleRef.get(MockEmailAdapter);

    // Seed Base Context
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      // 1. Customer
      const userRes = await queryRunner.query(`
        INSERT INTO identity.users (id, email, password_hash, first_name, last_name)
        VALUES (gen_random_uuid(), 'customer@anime.test', 'hash', 'Test', 'Customer') RETURNING id;
      `);
      customerUserId = userRes[0].id;

      // 2. Merchant
      const merchantRes = await queryRunner.query(
        `
        INSERT INTO commerce.merchants (id, owner_user_id, business_name, status)
        VALUES (gen_random_uuid(), $1, 'Merchant', 'ACTIVE') RETURNING id;
      `,
        [customerUserId],
      );
      merchantId = merchantRes[0].id;

      // 3. Event
      const eventRes = await queryRunner.query(
        `
        INSERT INTO events.events (id, merchant_id, title, start_time, end_time, currency, status)
        VALUES (gen_random_uuid(), $1, 'Test Event', NOW(), NOW() + INTERVAL '1 day', 'KES', $2) RETURNING id;
      `,
        [merchantId, EventStatus.PUBLISHED],
      );
      eventId = eventRes[0].id;

      // 4. Ticket Type
      const typeRes = await queryRunner.query(
        `
        INSERT INTO events.ticket_types (id, event_id, name, price, currency, capacity)
        VALUES (gen_random_uuid(), $1, 'VIP', '1000.00', 'KES', 500) RETURNING id;
      `,
        [eventId],
      );
      ticketTypeId = typeRes[0].id;

      // 5. Signing Key
      const { publicKey } = crypto.generateKeyPairSync('ed25519');
      const dynamicPublicKey = publicKey
        .export({ format: 'pem', type: 'spki' })
        .toString();
      const keyRes = await queryRunner.query(
        `
        INSERT INTO events.signing_keys (id, algorithm, public_key, status, valid_from)
        VALUES (gen_random_uuid(), 'Ed25519', $1, $2, NOW()) RETURNING id;
      `,
        [dynamicPublicKey, KeyStatus.ACTIVE],
      );
      keyId = keyRes[0].id;
    } finally {
      await queryRunner.release();
    }
  }, 30000);

  afterAll(async () => {
    if (moduleRef) await moduleRef.close();
    if (harness) await harness.stop();
  });

  // Helper to generate a fresh ticket & outbox message for isolated tests
  async function seedDeliveryScenario() {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      const orderRes = await queryRunner.query(
        `
        INSERT INTO commerce.orders (id, order_number, customer_id, merchant_id, gross_amount, currency, payment_status)
        VALUES (gen_random_uuid(), gen_random_uuid()::varchar(50), $1, $2, '1000.0000', 'KES', 'PAID') RETURNING id;
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
          keyId,
          '{}',
          'dummy_sig',
        ],
      );
      const ticketId = ticketRes[0].id;

      // FIX: Deterministic deduplication key added to Outbox seed
      const deduplicationKey = `TICKET:${ticketId}:DELIVERY:EMAIL:v1`;

      const outboxRes = await queryRunner.query(
        `
        INSERT INTO integration.outbox_messages (id, aggregate_type, aggregate_id, event_type, payload, deduplication_key, status, next_attempt_at)
        VALUES (gen_random_uuid(), 'Ticket', $1, 'TICKET_DELIVERY_REQUESTED', $2, $3, $4, NOW()) RETURNING id;
      `,
        [ticketId, '{}', deduplicationKey, OutboxStatus.PENDING],
      );

      return { orderId, ticketId, outboxMessageId: outboxRes[0].id };
    } finally {
      await queryRunner.release();
    }
  }

  it('1. First delivery succeeds and updates states to SENT/PUBLISHED', async () => {
    const { orderId, ticketId, outboxMessageId } = await seedDeliveryScenario();

    const spy = jest.spyOn(emailAdapter, 'sendTicket');

    await deliveryService.deliver({ outboxMessageId, ticketId, orderId });

    const delivery = await dataSource
      .getRepository(TicketDelivery)
      .findOneBy({ ticketId });
    expect(delivery).toBeDefined();
    expect(delivery?.status).toBe(DeliveryStatus.SENT);
    expect(delivery?.attemptCount).toBe(1);

    const outbox = await dataSource
      .getRepository(OutboxMessage)
      .findOneBy({ id: outboxMessageId });
    expect(outbox?.status).toBe(OutboxStatus.PUBLISHED);

    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockClear();
  });

  it('2. Same delivery request repeated is ignored (Idempotency)', async () => {
    const { orderId, ticketId, outboxMessageId } = await seedDeliveryScenario();
    const spy = jest.spyOn(emailAdapter, 'sendTicket');

    // First call
    await deliveryService.deliver({ outboxMessageId, ticketId, orderId });
    expect(spy).toHaveBeenCalledTimes(1);

    // Second call (simulate duplicated queue job)
    await deliveryService.deliver({ outboxMessageId, ticketId, orderId });

    // Adapter should NOT be called again
    expect(spy).toHaveBeenCalledTimes(1);

    const deliveries = await dataSource
      .getRepository(TicketDelivery)
      .find({ where: { ticketId } });
    expect(deliveries.length).toBe(1);
    expect(deliveries[0].attemptCount).toBe(1);

    spy.mockClear();
  });

  it('3. 10-Way Concurrent duplicate requests resolve to exactly 1 logical delivery', async () => {
    const { orderId, ticketId, outboxMessageId } = await seedDeliveryScenario();
    const spy = jest.spyOn(emailAdapter, 'sendTicket');

    const jobData = { outboxMessageId, ticketId, orderId };

    // Fire 10 simultaneous delivery jobs for the exact same Outbox payload
    const promises = Array(10)
      .fill(null)
      .map(() => deliveryService.deliver(jobData));
    await Promise.all(promises);

    // Assert: Adapter fired exactly once
    expect(spy).toHaveBeenCalledTimes(1);

    // Assert: Exactly one delivery record exists due to DB Locks and Unique constraints
    const deliveries = await dataSource
      .getRepository(TicketDelivery)
      .find({ where: { ticketId } });
    expect(deliveries.length).toBe(1);
    expect(deliveries[0].attemptCount).toBe(1);
    expect(deliveries[0].status).toBe(DeliveryStatus.SENT);

    spy.mockClear();
  });

  it('4. Provider failure records FAILED state and retains retry capability', async () => {
    const { orderId, ticketId, outboxMessageId } = await seedDeliveryScenario();

    // Mock the adapter to fail
    const spy = jest.spyOn(emailAdapter, 'sendTicket').mockResolvedValueOnce({
      success: false,
      error: 'SMTP Timeout',
    });

    await deliveryService.deliver({ outboxMessageId, ticketId, orderId });

    const delivery = await dataSource
      .getRepository(TicketDelivery)
      .findOneBy({ ticketId });
    expect(delivery?.status).toBe(DeliveryStatus.FAILED);
    expect(delivery?.lastError).toBe('SMTP Timeout');
    expect(delivery?.attemptCount).toBe(1);

    const outbox = await dataSource
      .getRepository(OutboxMessage)
      .findOneBy({ id: outboxMessageId });
    expect(outbox?.status).toBe(OutboxStatus.FAILED);

    spy.mockRestore();
  });

  it('5. Retry successfully recovers from FAILED to SENT', async () => {
    const { orderId, ticketId, outboxMessageId } = await seedDeliveryScenario();

    // Attempt 1: Fail
    jest
      .spyOn(emailAdapter, 'sendTicket')
      .mockResolvedValueOnce({ success: false, error: 'Network Error' });
    await deliveryService.deliver({ outboxMessageId, ticketId, orderId });

    let delivery = await dataSource
      .getRepository(TicketDelivery)
      .findOneBy({ ticketId });
    expect(delivery?.status).toBe(DeliveryStatus.FAILED);
    expect(delivery?.attemptCount).toBe(1);

    // Attempt 2: Succeed (simulate BullMQ auto-retry)
    jest
      .spyOn(emailAdapter, 'sendTicket')
      .mockResolvedValueOnce({ success: true, messageId: 'msg-123' });
    await deliveryService.deliver({ outboxMessageId, ticketId, orderId });

    delivery = await dataSource
      .getRepository(TicketDelivery)
      .findOneBy({ ticketId });
    expect(delivery?.status).toBe(DeliveryStatus.SENT);
    expect(delivery?.attemptCount).toBe(2);
    expect(delivery?.providerMessageId).toBe('msg-123');

    const outbox = await dataSource
      .getRepository(OutboxMessage)
      .findOneBy({ id: outboxMessageId });
    expect(outbox?.status).toBe(OutboxStatus.PUBLISHED);
  });
});
