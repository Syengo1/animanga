import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';

// Entities
import { Event } from './entities/event.entity';
import { TicketType } from './entities/ticket-type.entity';
import { TicketInventory } from './entities/ticket-inventory.entity';
import { TicketReservation } from './entities/ticket-reservation.entity';
import { SigningKey } from './entities/signing-key.entity';
import { Ticket } from './entities/ticket.entity';
import { TicketScanAttempt } from './entities/ticket-scan-attempt.entity';
import { TicketDelivery } from './entities/ticket-delivery.entity';

// Services
import { InventoryService } from './services/inventory.service';
import { TicketService } from './services/ticket.service';
import { SigningKeyService } from './services/signing-key.service';
import { TicketIssuanceService } from './services/ticket-issuance.service';
import { TicketValidationService } from './services/ticket-validation.service';
import { TicketDeliveryService } from './services/ticket-delivery.service';

// Adapters & Workers
import { MockEmailAdapter } from './adapters/notification.adapter';
import { TicketDeliveryWorker } from './workers/ticket-delivery.worker';

// Controllers
import { EventsController } from './controllers/events.controller';
import { ScannerController } from './controllers/scanner.controller';
import { TicketsController } from './controllers/tickets.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Event,
      TicketType,
      TicketInventory,
      TicketReservation,
      SigningKey,
      Ticket,
      TicketScanAttempt,
      TicketDelivery,
    ]),
    BullModule.registerQueue({
      name: 'ticket-delivery',
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [EventsController, ScannerController, TicketsController],
  providers: [
    InventoryService,
    TicketService,
    SigningKeyService,
    TicketIssuanceService,
    TicketValidationService,
    MockEmailAdapter,
    TicketDeliveryService,
    TicketDeliveryWorker,
  ],
  exports: [
    InventoryService,
    TicketService,
    SigningKeyService,
    TicketIssuanceService,
    TicketValidationService,
    TicketDeliveryService,
  ],
})
export class EventsModule {}
