import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TicketType } from './ticket-type.entity';

export enum TicketStatus {
  ISSUED = 'ISSUED',
  SCANNED = 'SCANNED',
  REVOKED = 'REVOKED',
}

@Entity('tickets', { schema: 'events' })
// Strict Idempotency: An order item can only generate its exact sequence of tickets once
@Unique(['orderItemId', 'sequenceNumber'])
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @Column({ name: 'order_item_id', type: 'uuid' })
  orderItemId: string;

  @ManyToOne(() => TicketType)
  @JoinColumn({ name: 'ticket_type_id' })
  ticketType: TicketType;

  @Column({ name: 'event_id', type: 'uuid' })
  eventId: string;

  @Column({ name: 'sequence_number', type: 'int' })
  sequenceNumber: number;

  @Column({ type: 'enum', enum: TicketStatus, default: TicketStatus.ISSUED })
  status: TicketStatus;

  // The canonical capability token
  @Column({ name: 'qr_payload', type: 'jsonb' })
  qrPayload: Record<string, any>;

  // The Ed25519 signature
  @Column({ type: 'text' })
  signature: string;

  // Audit trail for rotation
  @Column({ name: 'signing_key_id', type: 'uuid' })
  signingKeyId: string;

  @CreateDateColumn({ name: 'issued_at' })
  issuedAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
