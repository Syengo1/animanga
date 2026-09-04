import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { LedgerTransaction } from './ledger-transaction.entity';
import { Account } from './account.entity';

@Entity({ schema: 'finance', name: 'ledger_entries' })
export class LedgerEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => LedgerTransaction)
  @JoinColumn({ name: 'transaction_id' })
  transaction!: LedgerTransaction;

  @ManyToOne(() => Account)
  @JoinColumn({ name: 'account_id' })
  account!: Account;

  @Column({ type: 'enum', enum: ['DEBIT', 'CREDIT'] })
  direction!: 'DEBIT' | 'CREDIT';

  @Column({ type: 'numeric', precision: 19, scale: 4 })
  amount!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
