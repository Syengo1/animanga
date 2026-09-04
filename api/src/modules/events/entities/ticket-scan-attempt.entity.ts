import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { ScanResult } from '../enums/events.enums';

@Entity({ schema: 'events', name: 'ticket_scan_attempts' })
export class TicketScanAttempt {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Nullable string instead of relation: Allows us to log forged tickets that don't exist in DB
  @Column({ name: 'ticket_id', type: 'uuid', nullable: true })
  ticketId?: string;

  // We keep eventId as a raw column so we don't need to load relations on high-throughput scans
  @Column({ name: 'event_id', type: 'uuid' })
  eventId!: string;

  @Column({ name: 'scanner_user_id', type: 'uuid', nullable: true })
  scannerUserId?: string;

  @Column({ type: 'enum', enum: ScanResult })
  result!: ScanResult;

  @Column({ name: 'gate_id', type: 'varchar', length: 100, nullable: true })
  gateId?: string;

  // --- IMMUTABLE FORENSIC DATA (What did the scanner actually see?) ---
  @Column({ name: 'raw_payload', type: 'jsonb', nullable: true })
  rawPayload?: any;

  @Column({ name: 'raw_signature', type: 'text', nullable: true })
  rawSignature?: string;

  // --- DEVICE & SYNC METADATA ---
  @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true })
  latitude?: string;

  @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true })
  longitude?: string;

  @Column({ name: 'device_id', type: 'text', nullable: true })
  deviceId?: string;

  @Column({ name: 'app_version', type: 'varchar', length: 50, nullable: true })
  appVersion?: string;

  @Column({
    name: 'network_status',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  networkStatus?: string;

  @Column({ name: 'sync_sequence', type: 'bigint', nullable: true })
  syncSequence?: string;

  @CreateDateColumn({ name: 'scanned_at' })
  scannedAt!: Date;
}
