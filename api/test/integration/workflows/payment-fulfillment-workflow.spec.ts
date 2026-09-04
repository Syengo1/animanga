/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PostgresHarness } from '../../helpers/postgres.harness';

import { IdentityModule } from '../../../src/modules/identity/identity.module';
import { CommerceModule } from '../../../src/modules/commerce/commerce.module';
import { EventsModule } from '../../../src/modules/events/events.module';
import { FinanceModule } from '../../../src/modules/finance/finance.module';

import { CheckoutService } from '../../../src/modules/commerce/services/checkout.service';
import { FulfillmentService } from '../../../src/modules/commerce/services/fulfillment.service';

import { User } from '../../../src/modules/identity/entities/user.entity';
import { Merchant } from '../../../src/modules/commerce/entities/merchant.entity';
import { Event } from '../../../src/modules/events/entities/event.entity';
import { TicketType } from '../../../src/modules/events/entities/ticket-type.entity';
import { TicketInventory } from '../../../src/modules/events/entities/ticket-inventory.entity';
import { Order } from '../../../src/modules/commerce/entities/order.entity';
import { Payment } from '../../../src/modules/commerce/entities/payment.entity';
import { Ticket } from '../../../src/modules/events/entities/ticket.entity';
import { LedgerEntry } from '../../../src/modules/finance/entities/ledger-entry.entity';
import { Account } from '../../../src/modules/finance/entities/account.entity';

// FIX: Consolidated imports and added missing EventStatus
import {
  SigningKey,
  KeyStatus,
} from '../../../src/modules/events/entities/signing-key.entity';
import { EventStatus } from '../../../src/modules/events/enums/events.enums';
import {
  MerchantStatus,
  OrderPaymentStatus,
  FulfillmentStatus,
} from '../../../src/modules/commerce/enums/commerce.enums';

describe('Workflow: Cross-Domain Payment Fulfillment', () => {
  let harness: PostgresHarness;
  let moduleRef: TestingModule;
  let dataSource: DataSource;

  let checkoutService: CheckoutService;
  let fulfillmentService: FulfillmentService;

  let customer: User;
  let merchant: Merchant;
  let ticketType: TicketType;

  let pendingOrderId: string;
  let mpesaAssetAccount: Account;

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
        IdentityModule,
        CommerceModule,
        EventsModule,
        FinanceModule,
      ],
    })
      .overrideProvider(getQueueToken('payments'))
      .useValue({
        add: jest.fn(), // Mock the queue safely
      })
      .compile();

    dataSource = moduleRef.get(DataSource);
    checkoutService = moduleRef.get(CheckoutService);
    fulfillmentService = moduleRef.get(FulfillmentService);
  }, 30000);

  afterAll(async () => {
    if (moduleRef) await moduleRef.close();
    if (harness) await harness.stop();
  });

  it('1. Setup Accounts and Pending Order (Seeding)', async () => {
    const userRepo = dataSource.getRepository(User);
    const merchantRepo = dataSource.getRepository(Merchant);
    const eventRepo = dataSource.getRepository(Event);
    const ticketTypeRepo = dataSource.getRepository(TicketType);
    const inventoryRepo = dataSource.getRepository(TicketInventory);
    const accountRepo = dataSource.getRepository(Account);
    const keyRepo = dataSource.getRepository(SigningKey);

    // 1. Fetch or Seed Ledger Accounts
    let mpesaAsset = await accountRepo.findOneBy({
      accountCode: 'asset:clearing:mpesa',
    });
    if (!mpesaAsset) {
      mpesaAsset = new Account();
      mpesaAsset.accountCode = 'asset:clearing:mpesa';
      mpesaAsset.accountType = 'CLEARING';
      mpesaAsset.classification = 'ASSET' as any;
      mpesaAsset.currency = 'KES';
      mpesaAsset = await accountRepo.save(mpesaAsset);
    }
    mpesaAssetAccount = mpesaAsset;

    let merchantPayable = await accountRepo.findOneBy({
      accountCode: 'liability:merchants:payables',
    });
    if (!merchantPayable) {
      merchantPayable = new Account();
      merchantPayable.accountCode = 'liability:merchants:payables';
      merchantPayable.accountType = 'PAYABLE';
      merchantPayable.classification = 'LIABILITY' as any;
      merchantPayable.currency = 'KES';
      await accountRepo.save(merchantPayable);
    }

    let platformRevenue = await accountRepo.findOneBy({
      accountCode: 'revenue:platform:fees',
    });
    if (!platformRevenue) {
      platformRevenue = new Account();
      platformRevenue.accountCode = 'revenue:platform:fees';
      platformRevenue.accountType = 'FEE';
      platformRevenue.classification = 'REVENUE' as any;
      platformRevenue.currency = 'KES';
      await accountRepo.save(platformRevenue);
    }

    // 2. Seed Commerce & Events Data
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
        name: 'VIP Pass',
        price: '5000.0000',
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

    // 3. Seed Cryptographic Signing Key
    await keyRepo.save(
      keyRepo.create({
        algorithm: 'Ed25519',
        publicKey: 'mock-public-key',
        status: KeyStatus.ACTIVE,
      }),
    );

    // 4. Execute a Checkout to get a Pending Order
    const result = await checkoutService.processCheckout(
      customer.id,
      ticketType.id,
      2,
    );
    pendingOrderId = result.orderId;
  });

  it('2. Successfully fulfills order (Double-Entry Ledger, Ticket Generation, Order Status)', async () => {
    const ticketIds = await fulfillmentService.fulfillOrder(
      pendingOrderId,
      'MPESA_TX_12345',
    );

    // ASSERTION 1: Events Domain (Tickets Generated & Inventory shifted)
    expect(ticketIds.length).toBe(2);

    // FIX: Updated query to use orderId and updated assertions to match the new deterministic Ticket entity
    const tickets = await dataSource
      .getRepository(Ticket)
      .find({ where: { orderId: pendingOrderId } });

    expect(tickets.length).toBe(2);
    expect(tickets[0].signature).toBeDefined();
    expect(tickets[0].sequenceNumber).toBeDefined();
    expect(tickets[0].qrPayload).toBeDefined();

    const inventory = await dataSource
      .getRepository(TicketInventory)
      .findOneBy({ ticketTypeId: ticketType.id });
    expect(inventory?.availableQuantity).toBe(98);
    expect(inventory?.reservedQuantity).toBe(0);
    expect(inventory?.soldQuantity).toBe(2);

    // ASSERTION 2: Commerce Domain (Order & Payment records)
    const order = await dataSource
      .getRepository(Order)
      .findOneBy({ id: pendingOrderId });
    expect(order?.paymentStatus).toBe(OrderPaymentStatus.PAID);
    expect(order?.fulfillmentStatus).toBe(FulfillmentStatus.FULFILLED);

    const payment = await dataSource
      .getRepository(Payment)
      .findOneBy({ order: { id: pendingOrderId } });
    expect(payment).toBeDefined();
    expect(payment?.amount).toBe('10000.0000');

    // ASSERTION 3: Finance Domain (Ledger Consistency)
    const entries = await dataSource.getRepository(LedgerEntry).find({
      where: { transaction: { referenceId: payment?.id } },
      relations: { account: true },
    });

    const mpesaEntry = entries.find(
      (e) => e.account.id === mpesaAssetAccount.id && e.direction === 'DEBIT',
    );
    expect(mpesaEntry?.amount).toBe('10000.0000');
  });
});
