import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { StatementImport } from './statement-import.entity';

@Entity({ schema: 'integration', name: 'statement_lines' })
export class StatementLine {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => StatementImport, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'statement_import_id' })
  statementImport!: StatementImport;

  @Column({ type: 'varchar', length: 50 })
  provider!: string;

  @Column({ name: 'provider_statement_id', type: 'varchar', length: 255 })
  providerStatementId!: string;

  @Column({ name: 'provider_transaction_id', type: 'varchar', length: 255 })
  providerTransactionId!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reference?: string;

  @Column({ type: 'numeric', precision: 19, scale: 4 })
  amount!: string;

  @Column({ type: 'char', length: 3 })
  currency!: string;

  @Column({
    name: 'transaction_type',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  transactionType?: string;

  @Column({ name: 'occurred_at', type: 'timestamptz', nullable: true })
  occurredAt?: Date;

  @Column({ name: 'settled_at', type: 'timestamptz', nullable: true })
  settledAt?: Date;

  @Column({ name: 'statement_hash', type: 'char', length: 64 })
  statementHash!: string;

  @Column({ name: 'raw_payload', type: 'jsonb', nullable: true })
  rawPayload?: Record<string, unknown>;

  @CreateDateColumn({ name: 'imported_at' })
  importedAt!: Date;
}
