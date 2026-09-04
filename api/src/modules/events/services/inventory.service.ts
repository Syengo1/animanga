import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketInventory } from '../entities/ticket-inventory.entity';
import { TicketReservation } from '../entities/ticket-reservation.entity';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(TicketInventory)
    private readonly inventoryRepo: Repository<TicketInventory>,
    @InjectRepository(TicketReservation)
    private readonly reservationRepo: Repository<TicketReservation>,
  ) {}
  // Future implementation: reserveTickets, releaseReservation, commitSale, etc.
}
