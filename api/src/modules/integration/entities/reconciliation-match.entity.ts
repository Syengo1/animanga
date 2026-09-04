import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ReconciliationCase } from './reconciliation-case.entity';
import { StatementLine } from './statement-line.entity';

@Entity({ schema: 'integration', name: 'reconciliation_matches' })
export class ReconciliationMatch {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => ReconciliationCase, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reconciliation_case_id' })
  reconciliationCase!: ReconciliationCase;

  @ManyToOne(() => StatementLine, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'statement_line_id' })
  statementLine!: StatementLine;

  // We explicitly do NOT build a TypeORM relation to the Ledger domain to maintain bounds.
  // Validation is managed strictly by the domain application service.
  @Column({ name: 'ledger_transaction_id', type: 'uuid', nullable: true })
  ledgerTransactionId?: string;

  @Column({ name: 'matched_amount', type: 'numeric', precision: 19, scale: 4 })
  matchedAmount!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
