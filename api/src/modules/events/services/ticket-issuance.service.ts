import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { randomUUID } from 'crypto';

import { Ticket, TicketStatus } from '../entities/ticket.entity';
import { SigningKeyService } from './signing-key.service';
import { OutboxMessage } from '../../integration/entities/outbox-message.entity';
import { OutboxStatus } from '../../integration/enums/integration.enums';

export interface IssuanceRequest {
  orderId: string;
  orderItemId: string;
  ticketTypeId: string;
  eventId: string;
  quantity: number;
}

@Injectable()
export class TicketIssuanceService {
  private readonly logger = new Logger(TicketIssuanceService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly signingKeyService: SigningKeyService,
  ) {}

  async issueTickets(
    request: IssuanceRequest,
    externalManager?: EntityManager, // <-- NEW: Accepts parent transaction
  ): Promise<Ticket[]> {
    const activeKey = await this.signingKeyService.getActiveKey();

    // Isolate the core issuance logic so it can run on any manager
    const executeIssuance = async (
      manager: EntityManager,
    ): Promise<Ticket[]> => {
      const tickets: Ticket[] = [];
      for (let i = 1; i <= request.quantity; i++) {
        const ticketId = randomUUID();

        const qrPayload = {
          t_id: ticketId,
          e_id: request.eventId,
          tt_id: request.ticketTypeId,
          k_id: activeKey.id,
          v: 1,
        };

        const canonicalString = JSON.stringify(
          qrPayload,
          Object.keys(qrPayload).sort(),
        );
        const { signature, keyId } =
          this.signingKeyService.signPayload(canonicalString);

        const ticket = manager.create(Ticket, {
          id: ticketId,
          orderId: request.orderId,
          orderItemId: request.orderItemId,
          ticketType: { id: request.ticketTypeId },
          eventId: request.eventId,
          sequenceNumber: i,
          status: TicketStatus.ISSUED,
          qrPayload,
          signature,
          signingKeyId: keyId,
        });

        try {
          const savedTicket = await manager.save(ticket);
          tickets.push(savedTicket);

          const outboxMsg = manager.create(OutboxMessage, {
            aggregateType: 'TICKET',
            aggregateId: savedTicket.id,
            eventType: 'TICKET_DELIVERY_REQUESTED',
            payload: { ticketId: savedTicket.id, orderId: request.orderId },
            status: OutboxStatus.PENDING,
            deduplicationKey: `delivery:ticket:${savedTicket.id}`,
            nextAttemptAt: new Date(),
          });
          await manager.save(outboxMsg);
        } catch (error: unknown) {
          const isUniqueViolation =
            typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            (error as Record<string, unknown>).code === '23505';

          if (isUniqueViolation) {
            this.logger.warn(
              `Ticket sequence ${i} for item ${request.orderItemId} already issued. Skipping.`,
            );
            continue;
          }
          throw error;
        }
      }

      this.logger.log(
        `Issued ${tickets.length} new tickets for Order ${request.orderId}`,
      );
      return tickets;
    };

    // If a parent transaction manager was provided, inherit it. Otherwise, create a new atomic transaction.
    if (externalManager) {
      return executeIssuance(externalManager);
    } else {
      return this.dataSource.transaction(async (manager) => {
        return executeIssuance(manager);
      });
    }
  }
}
