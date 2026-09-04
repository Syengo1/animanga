/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config'; // <-- FIX 2: Added ConfigModule

// eslint-disable-next-line @typescript-eslint/no-require-imports
const request = require('supertest');

import { PostgresHarness } from '../helpers/postgres.harness';
import { IntegrationModule } from '../../src/modules/integration/integration.module';
import { FinanceModule } from '../../src/modules/finance/finance.module'; // <-- FIX 1: Added FinanceModule for TypeORM graph
import { ProviderEvent } from '../../src/modules/integration/entities/provider-event.entity';

describe('API Edge: Daraja STK Webhook (e2e)', () => {
  let app: INestApplication;
  let harness: PostgresHarness;
  let dataSource: DataSource;

  const mockQueueAdd = jest.fn();

  beforeAll(async () => {
    harness = new PostgresHarness();
    await harness.start();

    const host = (harness as any).container.getHost();
    const port = (harness as any).container.getPort();
    const username = (harness as any).container.getUsername();
    const password = (harness as any).container.getPassword();
    const database = (harness as any).container.getDatabase();

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }), // <-- FIX 2: Provide ConfigService globally
        TypeOrmModule.forRoot({
          type: 'postgres',
          host,
          port,
          username,
          password,
          database,
          // FIX: Explicitly load all entities to satisfy complex cross-module relationships
          entities: [__dirname + '/../../src/**/*.entity{.ts,.js}'],
          synchronize: false,
        }),
        FinanceModule, // <-- FIX 1: Provide related entities
        IntegrationModule,
      ],
    })
      .overrideProvider(getQueueToken('payments'))
      .useValue({ add: mockQueueAdd })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();

    dataSource = moduleRef.get(DataSource);
  }, 30000);

  afterAll(async () => {
    if (app) await app.close();
    if (harness) await harness.stop();
  });

  afterEach(() => {
    mockQueueAdd.mockClear();
  });

  it('1. Rejects invalid payloads missing Daraja structures (400)', async () => {
    const response = await request(app.getHttpServer())
      .post('/webhooks/daraja/stk')
      .send({ wrongFormat: true })
      .expect(400);

    expect(response.body.message).toBe('Validation failed');
  });

  it('2. Processes SUCCESSFUL Daraja STK callback (200)', async () => {
    const successPayload = {
      Body: {
        stkCallback: {
          MerchantRequestID: '29115-34620561-1',
          CheckoutRequestID: 'ws_CO_260820261200000000',
          ResultCode: 0,
          ResultDesc: 'The service request is processed successfully.',
          CallbackMetadata: {
            Item: [
              { Name: 'Amount', Value: 1500 },
              { Name: 'MpesaReceiptNumber', Value: 'UHQ81ABCD' },
              { Name: 'TransactionDate', Value: 20260826120000 },
              { Name: 'PhoneNumber', Value: 254700000000 },
            ],
          },
        },
      },
    };

    const response = await request(app.getHttpServer())
      .post('/webhooks/daraja/stk')
      .send(successPayload)
      .expect(200);

    expect(response.body.ResultCode).toBe(0);
    expect(response.body.ResultDesc).toBe('Accepted');

    const eventRepo = dataSource.getRepository(ProviderEvent);
    const savedEvent = await eventRepo.findOneBy({
      providerEventId: 'ws_CO_260820261200000000',
    });

    expect(savedEvent).toBeDefined();
    expect(savedEvent.provider).toBe('DARAJA');
    expect(savedEvent.eventType).toBe('PAYMENT_SUCCESS');

    expect(mockQueueAdd).toHaveBeenCalledTimes(1);
    const [jobName, jobData] = mockQueueAdd.mock.calls[0];
    expect(jobName).toBe('fulfill-order');
    expect(jobData.internalReferenceId).toBe('ws_CO_260820261200000000');
    expect(jobData.amount).toBe('1500');
    expect(jobData.providerTransactionId).toBe('UHQ81ABCD');
  });

  it('3. Safely absorbs DUPLICATE callbacks (Idempotency check)', async () => {
    const duplicatePayload = {
      Body: {
        stkCallback: {
          MerchantRequestID: '29115-34620561-1',
          CheckoutRequestID: 'ws_CO_260820261200000000',
          ResultCode: 0,
          ResultDesc: 'The service request is processed successfully.',
        },
      },
    };

    await request(app.getHttpServer())
      .post('/webhooks/daraja/stk')
      .send(duplicatePayload)
      .expect(200);

    expect(mockQueueAdd).not.toHaveBeenCalled();
  });

  it('4. Processes FAILED Daraja STK callback (user cancelled)', async () => {
    const failedPayload = {
      Body: {
        stkCallback: {
          MerchantRequestID: '29115-34620561-2',
          CheckoutRequestID: 'ws_CO_260820261200000001',
          ResultCode: 1032,
          ResultDesc: 'Request cancelled by user',
        },
      },
    };

    await request(app.getHttpServer())
      .post('/webhooks/daraja/stk')
      .send(failedPayload)
      .expect(200);

    expect(mockQueueAdd).toHaveBeenCalledTimes(1);
    const [, jobData] = mockQueueAdd.mock.calls[0];

    expect(jobData.internalReferenceId).toBe('ws_CO_260820261200000001');
    expect(jobData.eventType).toBe('PAYMENT_FAILED');
    expect(jobData.amount).toBeUndefined();
  });
});
