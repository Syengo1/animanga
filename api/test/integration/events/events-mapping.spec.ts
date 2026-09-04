/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PostgresHarness } from '../../helpers/postgres.harness';

import { IdentityModule } from '../../../src/modules/identity/identity.module';
import { CommerceModule } from '../../../src/modules/commerce/commerce.module';
import { EventsModule } from '../../../src/modules/events/events.module';

import { User } from '../../../src/modules/identity/entities/user.entity';
import { Merchant } from '../../../src/modules/commerce/entities/merchant.entity';
import { Event } from '../../../src/modules/events/entities/event.entity';
import { TicketType } from '../../../src/modules/events/entities/ticket-type.entity';
import { TicketInventory } from '../../../src/modules/events/entities/ticket-inventory.entity';
import { TicketScanAttempt } from '../../../src/modules/events/entities/ticket-scan-attempt.entity';
import { MerchantStatus } from '../../../src/modules/commerce/enums/commerce.enums';
import {
  EventStatus,
  ScanResult, // <-- FIX 1: Updated enum import
} from '../../../src/modules/events/enums/events.enums';

describe('Events Domain - TypeORM & Database Invariants', () => {
  let harness: PostgresHarness;
  let moduleRef: TestingModule;
  let dataSource: DataSource;

  let testUser: User;
  let testMerchant: Merchant;
  let testEvent: Event;
  let testTicketType: TicketType;

  beforeAll(async () => {
    harness = new PostgresHarness();
    await harness.start();

    const host = (harness as any).container.getHost();
    const port = (harness as any).container.getPort();
    // FIX 1: Extract dynamic root credentials to bypass application RBAC during seeding
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
          synchronize: true, // <-- FIX 2: Enable sync so the test DB adopts the new flat columns
        }),
        IdentityModule,
        CommerceModule,
        EventsModule,
      ],
    }).compile();

    dataSource = moduleRef.get(DataSource);
  }, 30000);

  afterAll(async () => {
    if (moduleRef) await moduleRef.close();
    if (harness) await harness.stop();
  });

  it('1. Setup Base Hierarchy (User -> Merchant -> Event -> TicketType)', async () => {
    const userRepo = dataSource.getRepository(User);
    const merchantRepo = dataSource.getRepository(Merchant);
    const eventRepo = dataSource.getRepository(Event);
    const ticketTypeRepo = dataSource.getRepository(TicketType);

    testUser = await userRepo.save(
      userRepo.create({
        email: 'event_manager@animanga.com',
        passwordHash: 'hash',
        firstName: 'Event',
        lastName: 'Manager',
      }),
    );

    testMerchant = await merchantRepo.save(
      merchantRepo.create({
        owner: testUser,
        businessName: 'Animanga 2026',
        operatingCurrency: 'KES',
        status: MerchantStatus.ACTIVE,
      }),
    );

    const startTime = new Date();
    const endTime = new Date();
    endTime.setDate(endTime.getDate() + 2); // 2 days later

    testEvent = await eventRepo.save(
      eventRepo.create({
        merchant: testMerchant,
        title: 'Animanga Main Event',
        startTime,
        endTime,
        currency: 'KES',
        status: EventStatus.ON_SALE,
      }),
    );

    testTicketType = await ticketTypeRepo.save(
      ticketTypeRepo.create({
        event: testEvent,
        name: 'VIP Weekend Pass',
        price: '5000.0000',
        currency: 'KES',
        capacity: 500,
      }),
    );

    expect(testTicketType.id).toBeDefined();
  });

  it('2. TicketInventory strictly enforces the capacity math invariant (Upper Bound)', async () => {
    const inventoryRepo = dataSource.getRepository(TicketInventory);

    // FIX 2: Included the mandatory capacity property for the math constraint
    const validInventory = await inventoryRepo.save(
      inventoryRepo.create({
        ticketTypeId: testTicketType.id,
        capacity: 500,
        availableQuantity: 500,
        reservedQuantity: 0,
        soldQuantity: 0,
      }),
    );
    expect(validInventory.version).toBe(1); // OCC version is 1

    // VALID: Move 2 tickets to RESERVED (498 + 2 + 0 == 500)
    validInventory.availableQuantity = 498;
    validInventory.reservedQuantity = 2;
    const updatedInventory = await inventoryRepo.save(validInventory);
    expect(updatedInventory.version).toBe(2); // OCC version bumped to 2

    // INVALID: Try to sell 5 tickets without reducing reserved/available (498 + 2 + 5 = 505 != 500)
    updatedInventory.soldQuantity = 5;
    await expect(inventoryRepo.save(updatedInventory)).rejects.toThrow(
      /violates check constraint/,
    );
  });

  // FIX 3: Added the explicit lower-bound test to prevent negative inventory states
  it('3. TicketInventory strictly prevents negative states (Lower Bound)', async () => {
    const inventoryRepo = dataSource.getRepository(TicketInventory);
    const inventory = await inventoryRepo.findOneBy({
      ticketTypeId: testTicketType.id,
    });

    expect(inventory).toBeDefined();

    // INVALID: Even if math matches (e.g., -1 + 1 + 500 = 500), negatives are blocked
    if (inventory) {
      inventory.availableQuantity = -1;
      inventory.reservedQuantity = 1;
      inventory.soldQuantity = 500;

      await expect(inventoryRepo.save(inventory)).rejects.toThrow(
        /violates check constraint/,
      );
    }
  });

  it('4. TicketScanAttempt is strictly append-only (rejects updates and deletes)', async () => {
    const scanRepo = dataSource.getRepository(TicketScanAttempt);

    const scan = await scanRepo.save(
      scanRepo.create({
        eventId: testEvent.id, // <-- FIX 3: Flat string ID instead of Event object relation
        scannerUserId: testUser.id, // <-- FIX 4: Flat string ID instead of User object relation
        result: ScanResult.INVALID_SIGNATURE, // <-- FIX 5: Updated enum
        appVersion: 'v1.0.0',
      }),
    );
    expect(scan.id).toBeDefined();

    scan.result = ScanResult.VALID; // <-- FIX 6: Updated enum
    await expect(scanRepo.save(scan)).rejects.toThrow(
      'Record is strictly immutable (append-only)',
    );
    await expect(scanRepo.remove(scan)).rejects.toThrow(
      'Record is strictly immutable (append-only)',
    );
  });
});
