import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity({ schema: 'finance', name: 'ledger_transactions' })
export class LedgerTransaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'transaction_type' })
  transactionType!: string;

  @Column({ name: 'reference_type' })
  referenceType!: string;

  @Column({ name: 'reference_id', type: 'varchar' })
  referenceId!: string;

  @Column({ name: 'idempotency_key', unique: true })
  idempotencyKey!: string;

  @Column({ name: 'request_hash', type: 'char', length: 64 })
  requestHash!: string;

  @Column({ default: 'KES' })
  currency!: string;

  @Column({ name: 'reverses_transaction_id', type: 'uuid', nullable: true })
  reversesTransactionId?: string;

  @Column({ default: 'POSTED' })
  status!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
