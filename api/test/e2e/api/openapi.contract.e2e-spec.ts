/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

import { Test, TestingModule } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

import { AppModule } from '../../../src/app.module';
import { PostgresHarness } from '../../helpers/postgres.harness';

describe('OpenAPI Contract (Freeze Verification)', () => {
  let pgHarness: PostgresHarness;
  let app: INestApplication;

  let document: any;

  beforeAll(async () => {
    // 1. Isolate the test in a Testcontainer to prevent local DB schema crashes
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
    app.setGlobalPrefix('api/v1');

    const config = new DocumentBuilder()
      .setTitle('Animanga Platform API')
      .setVersion('1.0.0')
      .build();

    document = SwaggerModule.createDocument(app, config);

    await app.init();
  }, 60000);

  afterAll(async () => {
    if (app) await app.close();
    if (pgHarness) await pgHarness.stop();
  });

  it('generates the Checkout endpoint with populated schemas', () => {
    const checkoutPath = document.paths['/api/v1/checkout'];
    expect(checkoutPath).toBeDefined();
    expect(checkoutPath.post).toBeDefined();

    const requestSchema =
      checkoutPath.post.requestBody.content['application/json'].schema;
    expect(requestSchema.properties).toHaveProperty('ticketTypeId');
    expect(requestSchema.properties).toHaveProperty('phoneNumber');

    const responseSchema =
      checkoutPath.post.responses['201'].content['application/json'].schema;
    expect(responseSchema.properties).toHaveProperty('orderId');
    expect(responseSchema.properties).toHaveProperty('checkoutSessionId');
  });

  it('generates the Ticket Wallet endpoint with populated schemas', () => {
    const walletPath = document.paths['/api/v1/tickets/wallet'];
    expect(walletPath).toBeDefined();
    expect(walletPath.get).toBeDefined();

    const responseSchema =
      walletPath.get.responses['200'].content['application/json'].schema;
    expect(responseSchema.properties).toHaveProperty('tickets');
    expect(responseSchema.properties.tickets.type).toBe('array');
  });

  it('generates the Scanner endpoint with populated schemas', () => {
    const scannerPath =
      document.paths['/api/v1/events/{eventId}/scanner/validate'];
    expect(scannerPath).toBeDefined();
    expect(scannerPath.post).toBeDefined();

    const requestSchema =
      scannerPath.post.requestBody.content['application/json'].schema;
    expect(requestSchema.properties).toHaveProperty('qrPayload');
    expect(requestSchema.properties).toHaveProperty('signature');

    const responseSchema =
      scannerPath.post.responses['201'].content['application/json'].schema;
    expect(responseSchema.properties).toHaveProperty('result');
    expect(responseSchema.properties).toHaveProperty('ticketId');
  });
});
