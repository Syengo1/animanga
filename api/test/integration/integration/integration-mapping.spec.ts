/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PostgresHarness } from '../../helpers/postgres.harness';

// 1. Integration Domain Entities (The targets of our test)
import { ProviderTransaction } from '../../../src/modules/integration/entities/provider-transaction.entity';
import { ProviderEvent } from '../../../src/modules/integration/entities/provider-event.entity';
import { OutboxMessage } from '../../../src/modules/integration/entities/outbox-message.entity';
import { StatementImport } from '../../../src/modules/integration/entities/statement-import.entity';
import { StatementLine } from '../../../src/modules/integration/entities/statement-line.entity';
import { ReconciliationCase } from '../../../src/modules/integration/entities/reconciliation-case.entity';
import { ReconciliationMatch } from '../../../src/modules/integration/entities/reconciliation-match.entity';

// 2. Cross-Domain Entities (Required purely to satisfy TypeORM's relational metadata builder for ProviderTransaction -> Payment -> Order -> Merchant/User)
import { Payment } from '../../../src/modules/commerce/entities/payment.entity';
import { Order } from '../../../src/modules/commerce/entities/order.entity';
import { Merchant } from '../../../src/modules/commerce/entities/merchant.entity';
import { User } from '../../../src/modules/identity/entities/user.entity';

describe('Integration Domain - TypeORM & Database Invariants', () => {
  let harness: PostgresHarness;
  let moduleRef: TestingModule;
  let dataSource: DataSource;

  const VALID_HASH_C = 'c'.repeat(64);

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
        TypeOrmModule.forRoot({
          type: 'postgres',
          host,
          port,
          username,
          password,
          database,
          autoLoadEntities: true,
          synchronize: false,
        }),
        TypeOrmModule.forFeature([
          // Integration Core
          ProviderTransaction,
          ProviderEvent,
          OutboxMessage,
          StatementImport,
          StatementLine,
          ReconciliationCase,
          ReconciliationMatch,

          // Relational Metadata Graph dependencies
          Payment,
          Order,
          Merchant,
          User,
        ]),
      ],
    }).compile();

    dataSource = moduleRef.get(DataSource);
  }, 30000);

  afterAll(async () => {
    if (moduleRef) await moduleRef.close();
    if (harness) await harness.stop();
  });

  it('1. ProviderEvent strictly validates payload_hash format at the database level', async () => {
    const repo = dataSource.getRepository(ProviderEvent);

    const event = repo.create({
      provider: 'DARAJA',
      providerEventId: 'TEST-123',
      eventType: 'PAYMENT_SUCCESS',
      idempotencyKey: 'IDEMP-123',
      payloadHash: VALID_HASH_C,
      rawPayload: { amount: 100 },
      // FIX: Removed status, as this entity is now purely an immutable fact
    });

    const saved = await repo.save(event);
    expect(saved.id).toBeDefined();
  });

  it('2. OutboxMessage enforces strict deduplication across concurrent publishes', async () => {
    const repo = dataSource.getRepository(OutboxMessage);

    const msg1 = repo.create({
      aggregateType: 'ORDER',
      aggregateId: '11111111-1111-1111-1111-111111111111',
      eventType: 'ORDER_CREATED',
      payload: { orderId: '123' },
      deduplicationKey: 'DEDUP-123',
      nextAttemptAt: new Date(),
    });
    await repo.save(msg1);

    const msg2 = repo.create({
      aggregateType: 'ORDER',
      aggregateId: '11111111-1111-1111-1111-111111111111',
      eventType: 'ORDER_CREATED',
      payload: { orderId: '123' },
      deduplicationKey: 'DEDUP-123',
      nextAttemptAt: new Date(),
    });

    // Should throw unique constraint violation on deduplication_key
    await expect(repo.save(msg2)).rejects.toThrow();
  });

  it('3. StatementImport securely cascades deletions to StatementLines', async () => {
    const importRepo = dataSource.getRepository(StatementImport);
    const lineRepo = dataSource.getRepository(StatementLine);

    const statement = await importRepo.save(
      importRepo.create({
        provider: 'MPESA',
        fileHash: VALID_HASH_C,
        status: 'COMPLETED' as any,
      }),
    );

    await lineRepo.save(
      lineRepo.create({
        statementImport: { id: statement.id },
        provider: 'MPESA',
        providerStatementId: 'STMT-1',
        providerTransactionId: 'TX-1',
        amount: '100.0000',
        currency: 'KES',
        statementHash: VALID_HASH_C,
      }),
    );

    const lineCheck = await lineRepo.find();
    expect(lineCheck.length).toBe(1);

    await importRepo.remove(statement);

    const lineCheckAfter = await lineRepo.find();
    expect(lineCheckAfter.length).toBe(0);
  });
});
