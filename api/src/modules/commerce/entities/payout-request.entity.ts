import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Merchant } from './merchant.entity';
import { User } from '../../identity/entities/user.entity';
import { PayoutStatus } from '../enums/commerce.enums';

@Entity({ schema: 'commerce', name: 'payout_requests' })
export class PayoutRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'payout_number', type: 'varchar', length: 50, unique: true })
  payoutNumber!: string;

  @ManyToOne(() => Merchant, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'merchant_id' })
  merchant!: Merchant;

  @Column({ type: 'numeric', precision: 19, scale: 4 })
  amount!: string;

  @Column({ type: 'char', length: 3 })
  currency!: string;

  @Column({ name: 'destination_reference', type: 'text' })
  destinationReference!: string;

  @Column({ type: 'enum', enum: PayoutStatus, default: PayoutStatus.REQUESTED })
  status!: PayoutStatus;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'requested_by' })
  requestedBy!: User;

  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'approved_by' })
  approvedBy?: User;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt?: Date;

  @Column({ name: 'payout_ledger_tx_id', type: 'uuid', nullable: true })
  payoutLedgerTxId?: string;

  @Column({ name: 'provider_transaction_id', type: 'uuid', nullable: true })
  providerTransactionId?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
