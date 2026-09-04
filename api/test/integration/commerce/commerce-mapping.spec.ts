/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PostgresHarness } from '../../helpers/postgres.harness';

import { IdentityModule } from '../../../src/modules/identity/identity.module';
import { CommerceModule } from '../../../src/modules/commerce/commerce.module';

import { User } from '../../../src/modules/identity/entities/user.entity';
import { Merchant } from '../../../src/modules/commerce/entities/merchant.entity';
import { Order } from '../../../src/modules/commerce/entities/order.entity';
import { MerchantStatus } from '../../../src/modules/commerce/enums/commerce.enums';

describe('Commerce Domain - TypeORM & Database Invariants', () => {
  let harness: PostgresHarness;
  let moduleRef: TestingModule;
  let dataSource: DataSource;

  beforeAll(async () => {
    harness = new PostgresHarness();
    await harness.start();

    const host = (harness as any).container.getHost();
    const port = (harness as any).container.getPort();

    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: host,
          port: port,
          username: 'animanga_app',
          password: 'app_password',
          database: 'animanga_test',
          autoLoadEntities: true,
          synchronize: false, // Strict adherence to Draft 06.2
        }),
        IdentityModule,
        CommerceModule,
      ],
    }).compile();

    dataSource = moduleRef.get(DataSource);
  }, 30000);

  afterAll(async () => {
    if (moduleRef) await moduleRef.close();
    if (harness) await harness.stop();
  });

  it('1. Successfully maps a User to a Merchant and supports soft deletes', async () => {
    const userRepo: Repository<User> = dataSource.getRepository(User);
    const merchantRepo: Repository<Merchant> =
      dataSource.getRepository(Merchant);

    // 1. Create the User (Identity Boundary)
    const user = await userRepo.save(
      userRepo.create({
        email: 'merchant_owner@animanga.com',
        passwordHash: 'secure_hash',
        firstName: 'Store',
        lastName: 'Owner',
      }),
    );

    // 2. Create the Merchant (Commerce Boundary)
    const merchant = await merchantRepo.save(
      merchantRepo.create({
        owner: user,
        businessName: 'Ngong Road Collectibles',
        operatingCurrency: 'KES',
        status: MerchantStatus.ACTIVE,
      }),
    );
    expect(merchant.id).toBeDefined();

    // 3. Test Soft Deletion for configuration entities
    await merchantRepo.softRemove(merchant);
    const deleted = await merchantRepo.findOne({
      where: { id: merchant.id },
      withDeleted: true,
    });
    expect(deleted?.deletedAt).toBeDefined();

    // Restore for the next test
    await merchantRepo.recover(deleted);
  });

  it('2. Enforces NUMERIC(19,4) precision and rejects negative amounts on Orders', async () => {
    const userRepo = dataSource.getRepository(User);
    const merchantRepo = dataSource.getRepository(Merchant);
    const orderRepo = dataSource.getRepository(Order);

    const user = await userRepo.findOneBy({
      email: 'merchant_owner@animanga.com',
    });
    const merchant = await merchantRepo.findOneBy({
      businessName: 'Ngong Road Collectibles',
    });

    // 1. Valid Order with strict fractional precision
    const validOrder = await orderRepo.save(
      orderRepo.create({
        orderNumber: 'AMG-2026-0001',
        customer: user,
        merchant: merchant,
        grossAmount: '2050.5500', // Stored as a string in TS, precise decimal in DB
        currency: 'KES',
      }),
    );
    expect(validOrder.id).toBeDefined();

    // Fetch to ensure the DB didn't drop our precision formatting
    const fetchedOrder = await orderRepo.findOneBy({ id: validOrder.id });
    expect(fetchedOrder?.grossAmount).toBe('2050.5500');

    // 2. Database natively blocks negative amounts (The CHECK constraint)
    const invalidOrder = orderRepo.create({
      orderNumber: 'AMG-2026-0002',
      customer: user,
      merchant: merchant,
      grossAmount: '-100.0000',
      currency: 'KES',
    });

    await expect(orderRepo.save(invalidOrder)).rejects.toThrow(
      /violates check constraint "orders_gross_amount_check"/,
    );
  });
});
