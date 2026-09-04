/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import request = require('supertest');
import * as crypto from 'crypto';

import { AppModule } from '../../../src/app.module';
import { PostgresHarness } from '../../helpers/postgres.harness';
import {
  EventStatus,
  KeyStatus,
  TicketStatus,
} from '../../../src/modules/events/enums/events.enums';
import { TransformInterceptor } from '../../../src/common/interceptors/transform.interceptor';
import { GlobalExceptionFilter } from '../../../src/common/filters/global-exception.filter';

describe('API Contract - Scanner (E2E)', () => {
  let pgHarness: PostgresHarness;
  let app: any;
  let dataSource: DataSource;

  // Domain state
  let eventId: string;
  let ticketId: string;
  let validPayload: Record<string, unknown>;
  let validSignature: string;

  beforeAll(async () => {
    pgHarness = new PostgresHarness();
    await pgHarness.start();

    process.env.SCANNER_API_KEY = 'test_scanner_key_123';

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

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      let userId = '';
      try {
        const res = await queryRunner.query(
          `INSERT INTO identity.users (id, email, password_hash, first_name, last_name) VALUES (gen_random_uuid(), 'fan@anime.test', 'hash', 'Test', 'Fan') RETURNING id;`,
        );
        userId = res[0].id;
      } catch {
        const res = await queryRunner.query(
          `INSERT INTO identity.users (id, email, "passwordHash", "firstName", "lastName") VALUES (gen_random_uuid(), 'fan@anime.test', 'hash', 'Test', 'Fan') RETURNING id;`,
        );
        userId = res[0].id;
      }

      let merchantId = '';
      try {
        const res = await queryRunner.query(
          `INSERT INTO commerce.merchants (id, owner_user_id, business_name, status) VALUES (gen_random_uuid(), $1, 'Merchant', 'ACTIVE') RETURNING id;`,
          [userId],
        );
        merchantId = res[0].id;
      } catch {
        const res = await queryRunner.query(
          `INSERT INTO commerce.merchants (id, "ownerUserId", "businessName", status) VALUES (gen_random_uuid(), $1, 'Merchant', 'ACTIVE') RETURNING id;`,
          [userId],
        );
        merchantId = res[0].id;
      }

      try {
        const res = await queryRunner.query(
          `INSERT INTO events.events (id, merchant_id, title, start_time, end_time, currency, status) VALUES (gen_random_uuid(), $1, 'Con', NOW(), NOW() + INTERVAL '1 day', 'KES', $2) RETURNING id;`,
          [merchantId, EventStatus.PUBLISHED],
        );
        eventId = res[0].id;
      } catch {
        const res = await queryRunner.query(
          `INSERT INTO events.events (id, "merchantId", title, "startTime", "endTime", currency, status) VALUES (gen_random_uuid(), $1, 'Con', NOW(), NOW() + INTERVAL '1 day', 'KES', $2) RETURNING id;`,
          [merchantId, EventStatus.PUBLISHED],
        );
        eventId = res[0].id;
      }

      let typeId = '';
      try {
        const res = await queryRunner.query(
          `INSERT INTO events.ticket_types (id, event_id, name, price, currency, capacity) VALUES (gen_random_uuid(), $1, 'GA', '1000.00', 'KES', 500) RETURNING id;`,
          [eventId],
        );
        typeId = res[0].id;
      } catch {
        const res = await queryRunner.query(
          `INSERT INTO events.ticket_types (id, "eventId", name, price, currency, capacity) VALUES (gen_random_uuid(), $1, 'GA', '1000.00', 'KES', 500) RETURNING id;`,
          [eventId],
        );
        typeId = res[0].id;
      }

      const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
      let keyId = '';
      try {
        const res = await queryRunner.query(
          `INSERT INTO events.signing_keys (id, algorithm, public_key, status, valid_from) VALUES (gen_random_uuid(), 'Ed25519', $1, $2, NOW()) RETURNING id;`,
          [
            publicKey.export({ format: 'pem', type: 'spki' }).toString(),
            KeyStatus.ACTIVE,
          ],
        );
        keyId = res[0].id;
      } catch {
        const res = await queryRunner.query(
          `INSERT INTO events.signing_keys (id, algorithm, "publicKey", status, "validFrom") VALUES (gen_random_uuid(), 'Ed25519', $1, $2, NOW()) RETURNING id;`,
          [
            publicKey.export({ format: 'pem', type: 'spki' }).toString(),
            KeyStatus.ACTIVE,
          ],
        );
        keyId = res[0].id;
      }

      let orderId = '';
      try {
        const res = await queryRunner.query(
          `INSERT INTO commerce.orders (id, order_number, customer_id, merchant_id, gross_amount, currency, payment_status) VALUES (gen_random_uuid(), 'ORD-1', $1, $2, '1000.0000', 'KES', 'PAID') RETURNING id;`,
          [userId, merchantId],
        );
        orderId = res[0].id;
      } catch {
        const res = await queryRunner.query(
          `INSERT INTO commerce.orders (id, "orderNumber", "customerId", "merchantId", "grossAmount", currency, "paymentStatus") VALUES (gen_random_uuid(), 'ORD-1', $1, $2, '1000.0000', 'KES', 'PAID') RETURNING id;`,
          [userId, merchantId],
        );
        orderId = res[0].id;
      }

      try {
        const res = await queryRunner.query(
          `INSERT INTO events.tickets (id, order_id, order_item_id, event_id, ticket_type_id, sequence_number, status, signing_key_id, qr_payload, signature) VALUES (gen_random_uuid(), $1, gen_random_uuid(), $2, $3, 1, $4, $5, '{}', 'sig') RETURNING id;`,
          [orderId, eventId, typeId, TicketStatus.ISSUED, keyId],
        );
        ticketId = res[0].id;
      } catch {
        const res = await queryRunner.query(
          `INSERT INTO events.tickets (id, "orderId", "orderItemId", "eventId", "ticketTypeId", "sequenceNumber", status, "signingKeyId", "qrPayload", signature) VALUES (gen_random_uuid(), $1, gen_random_uuid(), $2, $3, 1, $4, $5, '{}', 'sig') RETURNING id;`,
          [orderId, eventId, typeId, TicketStatus.ISSUED, keyId],
        );
        ticketId = res[0].id;
      }

      validPayload = { t_id: ticketId, e_id: eventId, k_id: keyId };
      const canonical = JSON.stringify(
        validPayload,
        Object.keys(validPayload).sort(),
      );
      validSignature = crypto
        .sign(null, Buffer.from(canonical), privateKey)
        .toString('base64');
    } finally {
      await queryRunner.release();
    }
  }, 60000);

  afterAll(async () => {
    if (app) await app.close();
    if (pgHarness) await pgHarness.stop();
  });

  it('1. Rejects request with missing Scanner Identity (401)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/events/${eventId}/scanner/validate`)
      .send({ qrPayload: validPayload, signature: validSignature });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('2. Rejects request with malformed QR Payload (400 - Zod)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/events/${eventId}/scanner/validate`)
      .set('x-scanner-api-key', 'test_scanner_key_123')
      .send({ qrPayload: [], signature: validSignature });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Validation failed');
  });

  it('3. Successfully validates a pristine ticket (201)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/events/${eventId}/scanner/validate`)
      .set('x-scanner-api-key', 'test_scanner_key_123')
      .send({ qrPayload: validPayload, signature: validSignature });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.result).toBe('VALID');
    expect(res.body.data.ticketId).toBe(ticketId);
    expect(res.body.meta.requestId).toBeDefined();
  });

  it('4. Deterministically rejects a second scan as DUPLICATE', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/events/${eventId}/scanner/validate`)
      .set('x-scanner-api-key', 'test_scanner_key_123')
      .send({ qrPayload: validPayload, signature: validSignature });

    expect(res.status).toBe(201);
    expect(res.body.data.result).toBe('DUPLICATE');
  });

  it('5. 50-way Concurrent HTTP Scans yield exactly 1 VALID and 49 DUPLICATEs', async () => {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    let freshTicketId: string;
    let freshPayload: Record<string, unknown>;
    let freshSignature: string;

    try {
      const [{ id: typeId }] = await queryRunner.query(
        `SELECT id FROM events.ticket_types LIMIT 1`,
      );
      const [{ id: orderId }] = await queryRunner.query(
        `SELECT id FROM commerce.orders LIMIT 1`,
      );
      const [{ id: keyId }] = await queryRunner.query(
        `SELECT id FROM events.signing_keys LIMIT 1`,
      );

      try {
        const ticketRes = await queryRunner.query(
          `INSERT INTO events.tickets (id, order_id, order_item_id, event_id, ticket_type_id, sequence_number, status, signing_key_id, qr_payload, signature) VALUES (gen_random_uuid(), $1, gen_random_uuid(), $2, $3, 2, $4, $5, '{}', 'sig') RETURNING id;`,
          [orderId, eventId, typeId, TicketStatus.ISSUED, keyId],
        );
        freshTicketId = ticketRes[0].id;
      } catch {
        const ticketRes = await queryRunner.query(
          `INSERT INTO events.tickets (id, "orderId", "orderItemId", "eventId", "ticketTypeId", "sequenceNumber", status, "signingKeyId", "qrPayload", signature) VALUES (gen_random_uuid(), $1, gen_random_uuid(), $2, $3, 2, $4, $5, '{}', 'sig') RETURNING id;`,
          [orderId, eventId, typeId, TicketStatus.ISSUED, keyId],
        );
        freshTicketId = ticketRes[0].id;
      }

      const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
      let freshKeyId = '';
      try {
        const freshKeyRes = await queryRunner.query(
          `INSERT INTO events.signing_keys (id, algorithm, public_key, status, valid_from) VALUES (gen_random_uuid(), 'Ed25519', $1, $2, NOW()) RETURNING id;`,
          [
            publicKey.export({ format: 'pem', type: 'spki' }).toString(),
            KeyStatus.ACTIVE,
          ],
        );
        freshKeyId = freshKeyRes[0].id;
      } catch {
        const freshKeyRes = await queryRunner.query(
          `INSERT INTO events.signing_keys (id, algorithm, "publicKey", status, "validFrom") VALUES (gen_random_uuid(), 'Ed25519', $1, $2, NOW()) RETURNING id;`,
          [
            publicKey.export({ format: 'pem', type: 'spki' }).toString(),
            KeyStatus.ACTIVE,
          ],
        );
        freshKeyId = freshKeyRes[0].id;
      }

      freshPayload = { t_id: freshTicketId, e_id: eventId, k_id: freshKeyId };
      const canonical = JSON.stringify(
        freshPayload,
        Object.keys(freshPayload).sort(),
      );
      freshSignature = crypto
        .sign(null, Buffer.from(canonical), privateKey)
        .toString('base64');
    } finally {
      await queryRunner.release();
    }

    const promises = Array(50)
      .fill(null)
      .map(() =>
        request(app.getHttpServer())
          .post(`/api/v1/events/${eventId}/scanner/validate`)
          .set('x-scanner-api-key', 'test_scanner_key_123')
          .send({ qrPayload: freshPayload, signature: freshSignature }),
      );

    const responses = await Promise.all(promises);

    const validCount = responses.filter(
      (r) => r.body.data?.result === 'VALID',
    ).length;
    const duplicateCount = responses.filter(
      (r) => r.body.data?.result === 'DUPLICATE',
    ).length;

    expect(validCount).toBe(1);
    expect(duplicateCount).toBe(49);
  }, 10000);
});
