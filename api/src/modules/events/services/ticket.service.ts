import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Ticket } from '../entities/ticket.entity';
import { TicketScanAttempt } from '../entities/ticket-scan-attempt.entity';
import { SigningKey } from '../entities/signing-key.entity';
import { TicketWalletPresentationDto } from '../dto/ticket-wallet.dto';

// Explicitly type the expected shape of the raw Postgres SQL join
interface RawTicketRow {
  id: string;
  sequence_number: number;
  status: 'ISSUED' | 'SCANNED' | 'REVOKED' | 'REFUNDED';
  qr_payload: Record<string, unknown>;
  signature: string;
  event_id: string;
  event_title: string;
  event_start_time: Date;
  ticket_type_name: string;
}

@Injectable()
export class TicketService {
  private readonly logger = new Logger(TicketService.name);

  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(TicketScanAttempt)
    private readonly scanAttemptRepo: Repository<TicketScanAttempt>,
    @InjectRepository(SigningKey)
    private readonly keyRepo: Repository<SigningKey>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  /**
   * CQRS Read-Model: Fetches a flat, presentation-ready wallet for a specific customer.
   * Joins across events and commerce schemas to avoid cross-module circular dependencies.
   */
  async getCustomerWallet(
    customerId: string,
  ): Promise<TicketWalletPresentationDto[]> {
    const rawResult: unknown = await this.dataSource.query(
      `
      SELECT 
        t.id,
        t.sequence_number,
        t.status,
        t.qr_payload,
        t.signature,
        e.id AS event_id,
        e.title AS event_title,
        e.start_time AS event_start_time,
        tt.name AS ticket_type_name
      FROM events.tickets t
      INNER JOIN commerce.orders o ON t.order_id = o.id
      INNER JOIN events.events e ON t.event_id = e.id
      INNER JOIN events.ticket_types tt ON t.ticket_type_id = tt.id
      WHERE o.customer_id = $1
      ORDER BY e.start_time ASC, t.sequence_number ASC
      `,
      [customerId],
    );

    // Safely cast through unknown to eliminate ESLint 'any' violations
    const rows = rawResult as RawTicketRow[];

    // Map strictly to the TicketWalletPresentationSchema expectations
    return rows.map((row) => ({
      id: row.id,
      ticketNumber: `ANM-${String(row.sequence_number).padStart(5, '0')}`,
      event: {
        id: row.event_id,
        title: row.event_title,
        startTime: row.event_start_time.toISOString(),
        venue: 'TBD', // Placeholder until Content/Venue domain is built
      },
      ticketType: row.ticket_type_name,
      status: row.status,
      credential: {
        // Enforce string keys for Zod v4 Record requirements
        payload: row.qr_payload,
        signature: row.signature,
      },
    }));
  }
}
