import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Payment } from '../../commerce/entities/payment.entity';
import { ProviderTxStatus } from '../enums/integration.enums';

@Entity({ schema: 'integration', name: 'provider_transactions' })
export class ProviderTransaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50 })
  provider!: string;

  @Column({ name: 'provider_transaction_id', type: 'varchar', length: 255 })
  providerTransactionId!: string;

  @ManyToOne(() => Payment, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'internal_payment_id' })
  internalPayment?: Payment;

  @Column({ type: 'numeric', precision: 19, scale: 4 })
  amount!: string;

  @Column({ type: 'char', length: 3 })
  currency!: string;

  @Column({ type: 'enum', enum: ProviderTxStatus })
  status!: ProviderTxStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
