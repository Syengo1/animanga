/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as crypto from 'crypto';
import { ConfigModule } from '@nestjs/config';

import { PostgresHarness } from '../../helpers/postgres.harness';

import { EventsModule } from '../../../src/modules/events/events.module';
import { IdentityModule } from '../../../src/modules/identity/identity.module';
import { CommerceModule } from '../../../src/modules/commerce/commerce.module';

import { TicketValidationService } from '../../../src/modules/events/services/ticket-validation.service';
import { SigningKeyService } from '../../../src/modules/events/services/signing-key.service';

import { Event } from '../../../src/modules/events/entities/event.entity';
import { Ticket } from '../../../src/modules/events/entities/ticket.entity';
import { TicketScanAttempt } from '../../../src/modules/events/entities/ticket-scan-attempt.entity';
import {
  EventStatus,
  KeyStatus,
  ScanResult,
  TicketStatus,
} from '../../../src/modules/events/enums/events.enums';

describe('Events Domain - 50-Way Concurrency Validation', () => {
  let harness: PostgresHarness;
  let moduleRef: TestingModule;
  let dataSource: DataSource;
  let validationService: TicketValidationService;
  let signingKeyService: SigningKeyService;

  let testEventId: string;
  let testTicketId: string;
  let testKeyId: string;
  let validQrPayload: Record<string, unknown>;
  let validSignature: string;

  beforeAll(async () => {
    harness = new PostgresHarness();
    await harness.start();

    const host = (harness as any).container.getHost();
    const port = (harness as any).container.getPort();
    const username = (harness as any).container.getUsername();
    const password = (harness as any).container.getPassword();
    const database = (harness as any).container.getDatabase();

    // 1. Generate an ephemeral Ed25519 Key Pair
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
    process.env.TICKET_PRIVATE_KEY = privateKey
      .export({ format: 'pem', type: 'pkcs8' })
      .toString();
    const dynamicPublicKey = publicKey
      .export({ format: 'pem', type: 'spki' })
      .toString();

    // --- FIX: Defensively nuke all schemas to prevent TypeORM from choking on zombie container state ---
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

    await adminRunner.query(`CREATE SCHEMA events;`);
    await adminRunner.query(`CREATE SCHEMA commerce;`);
    await adminRunner.query(`CREATE SCHEMA identity;`);
    await adminRunner.query(`CREATE SCHEMA finance;`);
    await adminRunner.destroy();
    // --------------------------------------------------------------------------------------------------

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
          synchronize: true, // Auto-build the schema on a truly empty database
          poolSize: 50, // Crucial: Allow 50 concurrent DB connections for the test
        }),
        IdentityModule,
        CommerceModule,
        EventsModule,
      ],
    }).compile();

    dataSource = moduleRef.get(DataSource);
    validationService = moduleRef.get(TicketValidationService);
    signingKeyService = moduleRef.get(SigningKeyService);

    // 2. Seed the necessary test data
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      // 1. Create a root User
      const userRes = await queryRunner.query(`
        INSERT INTO identity.users (id, email, password_hash, first_name, last_name)
        VALUES (gen_random_uuid(), 'concurrency@test.com', 'hash', 'Test', 'User') RETURNING id;
      `);
      const userId = userRes[0].id;

      // 2. Create a Merchant for that User
      const merchantRes = await queryRunner.query(
        `
        INSERT INTO commerce.merchants (id, owner_user_id, business_name, status)
        VALUES (gen_random_uuid(), $1, 'Concurrency Test Merchant', 'ACTIVE') RETURNING id;
      `,
        [userId],
      );
      const merchantId = merchantRes[0].id;

      // 3. Create the Event linked to the actual Merchant
      const eventRes = await queryRunner.query(
        `
        INSERT INTO events.events (id, merchant_id, title, start_time, end_time, currency, status)
        VALUES (gen_random_uuid(), $1, 'Concurrency Test Event', NOW(), NOW() + INTERVAL '1 day', 'KES', $2) RETURNING id;
      `,
        [merchantId, EventStatus.PUBLISHED],
      );
      testEventId = eventRes[0].id;

      // 4. Create Ticket Type
      const typeRes = await queryRunner.query(
        `
        INSERT INTO events.ticket_types (id, event_id, name, price, currency, capacity)
        VALUES (gen_random_uuid(), $1, 'General Admission', '1000.00', 'KES', 500) RETURNING id;
      `,
        [testEventId],
      );
      const ticketTypeId = typeRes[0].id;

      // 5. Create Signing Key
      const keyRes = await queryRunner.query(
        `
        INSERT INTO events.signing_keys (id, algorithm, public_key, status, valid_from)
        VALUES (gen_random_uuid(), 'Ed25519', $1, $2, NOW()) RETURNING id;
      `,
        [dynamicPublicKey, KeyStatus.ACTIVE],
      );
      testKeyId = keyRes[0].id;

      // 6. Create an ISSUED Ticket (with dummy payload/sig to satisfy NOT NULL constraints)
      const ticketRes = await queryRunner.query(
        `
        INSERT INTO events.tickets (id, order_id, order_item_id, event_id, ticket_type_id, sequence_number, status, signing_key_id, qr_payload, signature)
        VALUES (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), $1, $2, 1, $3, $4, $5, $6) RETURNING id;
      `,
        [
          testEventId,
          ticketTypeId,
          TicketStatus.ISSUED,
          testKeyId,
          '{}',
          'dummy_sig',
        ],
      );
      testTicketId = ticketRes[0].id;
    } finally {
      await queryRunner.release();
    }

    // 3. Force cache the key and generate the valid Cryptographic Payload
    await signingKeyService.getActiveKey();

    validQrPayload = {
      t_id: testTicketId,
      e_id: testEventId,
      tt_id: 'd6f25b76-1bac-47c7-81bc-a9158472d6e7', // Dummy value, unused in validation
      k_id: testKeyId,
      v: 1,
    };
    const canonicalString = JSON.stringify(
      validQrPayload,
      Object.keys(validQrPayload).sort(),
    );
    const { signature } = signingKeyService.signPayload(canonicalString);
    validSignature = signature;
  }, 30000);

  afterAll(async () => {
    if (moduleRef) await moduleRef.close();
    if (harness) await harness.stop();
  });

  it('1. Exactly ONE concurrent scan succeeds, the rest are rejected as DUPLICATE', async () => {
    const CONCURRENCY_COUNT = 50;

    // Create 50 identical validation requests targeting the exact same ticket
    const promises = Array(CONCURRENCY_COUNT)
      .fill(null)
      .map((_, index) => {
        return validationService.validateTicket({
          eventId: testEventId,
          deviceId: `device-${index}`,
          gateId: `gate-main`,
          qrPayload: validQrPayload,
          signature: validSignature,
        });
      });

    // Fire all 50 requests at the exact same millisecond
    const results = await Promise.all(promises);

    // Assertions
    const validCount = results.filter(
      (r) => r.result === ScanResult.VALID,
    ).length;
    const duplicateCount = results.filter(
      (r) => r.result === ScanResult.DUPLICATE,
    ).length;

    expect(validCount).toBe(1);
    expect(duplicateCount).toBe(CONCURRENCY_COUNT - 1);

    // Verify Database State: Ticket is SCANNED
    const ticket = await dataSource
      .getRepository(Ticket)
      .findOneBy({ id: testTicketId });
    expect(ticket?.status).toBe(TicketStatus.SCANNED);

    // Verify Database State: 50 Immutable Audit Logs exist
    const attempts = await dataSource.getRepository(TicketScanAttempt).find({
      where: { ticketId: testTicketId },
    });
    expect(attempts.length).toBe(CONCURRENCY_COUNT);

    // Exactly one audit log should show VALID
    const validAttempts = attempts.filter((a) => a.result === ScanResult.VALID);
    expect(validAttempts.length).toBe(1);
  });
});
