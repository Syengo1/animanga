/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { PostgresHarness } from '../../helpers/postgres.harness';

import { IdentityModule } from '../../../src/modules/identity/identity.module';
import { CommerceModule } from '../../../src/modules/commerce/commerce.module';
import { EventsModule } from '../../../src/modules/events/events.module';

import { CheckoutService } from '../../../src/modules/commerce/services/checkout.service';

import { User } from '../../../src/modules/identity/entities/user.entity';
import { Merchant } from '../../../src/modules/commerce/entities/merchant.entity';
import { Event } from '../../../src/modules/events/entities/event.entity';
import { TicketType } from '../../../src/modules/events/entities/ticket-type.entity';
import { TicketInventory } from '../../../src/modules/events/entities/ticket-inventory.entity';
import { Order } from '../../../src/modules/commerce/entities/order.entity';

import { MerchantStatus } from '../../../src/modules/commerce/enums/commerce.enums';
import { EventStatus } from '../../../src/modules/events/enums/events.enums';

describe('Workflow: Cross-Domain Checkout', () => {
  let harness: PostgresHarness;
  let moduleRef: TestingModule;
  let dataSource: DataSource;
  let checkoutService: CheckoutService;

  let customer: User;
  let merchant: Merchant;
  let ticketType: TicketType;

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
          synchronize: false,
        }),
        IdentityModule,
        CommerceModule,
        EventsModule,
      ],
    }).compile();

    dataSource = moduleRef.get(DataSource);
    checkoutService = moduleRef.get(CheckoutService);
  }, 30000);

  afterAll(async () => {
    if (moduleRef) await moduleRef.close();
    if (harness) await harness.stop();
  });

  it('1. Setup Initial State (Seeding)', async () => {
    const userRepo = dataSource.getRepository(User);
    const merchantRepo = dataSource.getRepository(Merchant);
    const eventRepo = dataSource.getRepository(Event);
    const ticketTypeRepo = dataSource.getRepository(TicketType);
    const inventoryRepo = dataSource.getRepository(TicketInventory);

    customer = await userRepo.save(
      userRepo.create({ email: 'buyer@animanga.com', passwordHash: 'hash' }),
    );
    const owner = await userRepo.save(
      userRepo.create({ email: 'owner@animanga.com', passwordHash: 'hash' }),
    );

    merchant = await merchantRepo.save(
      merchantRepo.create({
        owner,
        businessName: 'Animanga Inc',
        status: MerchantStatus.ACTIVE,
      }),
    );

    const startTime = new Date();
    const endTime = new Date();
    endTime.setHours(endTime.getHours() + 4);

    const event = await eventRepo.save(
      eventRepo.create({
        merchant,
        title: 'Anime Festival',
        startTime,
        endTime,
        currency: 'KES',
        status: EventStatus.ON_SALE,
      }),
    );

    ticketType = await ticketTypeRepo.save(
      ticketTypeRepo.create({
        event,
        name: 'General Admission',
        price: '2000.0000',
        currency: 'KES',
        capacity: 100,
      }),
    );

    await inventoryRepo.save(
      inventoryRepo.create({
        ticketTypeId: ticketType.id,
        capacity: 100,
        availableQuantity: 100,
        reservedQuantity: 0,
        soldQuantity: 0,
      }),
    );
  });

  it('2. Successfully executes a cross-domain checkout transaction', async () => {
    const result = await checkoutService.processCheckout(
      customer.id,
      ticketType.id,
      2,
    );

    expect(result.orderId).toBeDefined();
    const order = await dataSource
      .getRepository(Order)
      .findOneBy({ id: result.orderId });
    expect(order?.grossAmount).toBe('4000.0000');

    const inventory = await dataSource
      .getRepository(TicketInventory)
      .findOneBy({ ticketTypeId: ticketType.id });
    expect(inventory?.availableQuantity).toBe(98);
    expect(inventory?.reservedQuantity).toBe(2);
  });

  it('3. Proves atomic rollback: Invalid order rolls back inventory', async () => {
    /* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return */
    const originalSave = EntityManager.prototype.save;

    const saveSpy = jest
      .spyOn(EntityManager.prototype, 'save')
      .mockImplementation(function (
        this: EntityManager,
        ...args: any[]
      ): Promise<any> {
        const entity = args.length > 0 ? args[0] : null;
        if (entity instanceof Order) {
          return Promise.reject(new Error('Simulated Database Failure'));
        }
        return originalSave.apply(this, args as any);
      } as any);
    /* eslint-enable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return */

    // Attempt checkout (fails during Order creation)
    await expect(
      checkoutService.processCheckout(customer.id, ticketType.id, 5),
    ).rejects.toThrow('Checkout workflow failed');

    // Restore the database functionality
    saveSpy.mockRestore();

    // Verify inventory was perfectly rolled back (still 98 available, not 93)
    const inventory = await dataSource
      .getRepository(TicketInventory)
      .findOneBy({ ticketTypeId: ticketType.id });
    expect(inventory?.availableQuantity).toBe(98);
    expect(inventory?.reservedQuantity).toBe(2);
  });

  it('4. Pessimistic Lock ensures extreme concurrency safety (100 simultaneous checkouts)', async () => {
    const inventoryRepo = dataSource.getRepository(TicketInventory);
    await inventoryRepo.update(ticketType.id, {
      availableQuantity: 100,
      reservedQuantity: 0,
    });

    const promises = Array(100)
      .fill(0)
      .map(() =>
        checkoutService.processCheckout(customer.id, ticketType.id, 1),
      );
    const results = await Promise.all(promises);

    expect(results.length).toBe(100);

    const inventory = await inventoryRepo.findOneBy({
      ticketTypeId: ticketType.id,
    });
    expect(inventory?.availableQuantity).toBe(0);
    expect(inventory?.reservedQuantity).toBe(100);

    await expect(
      checkoutService.processCheckout(customer.id, ticketType.id, 1),
    ).rejects.toThrow('Not enough tickets available');
  });
});
