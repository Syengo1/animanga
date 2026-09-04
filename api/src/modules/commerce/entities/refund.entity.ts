import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { User } from '../../identity/entities/user.entity';
import { RefundWorkflowStatus } from '../enums/commerce.enums';

@Entity({ schema: 'commerce', name: 'refunds' })
export class Refund {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'refund_number', type: 'varchar', length: 50, unique: true })
  refundNumber!: string;

  @ManyToOne(() => Order, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @Column({ type: 'numeric', precision: 19, scale: 4 })
  amount!: string;

  @Column({ type: 'char', length: 3 })
  currency!: string;

  @Column({
    type: 'enum',
    enum: RefundWorkflowStatus,
    default: RefundWorkflowStatus.REQUESTED,
  })
  status!: RefundWorkflowStatus;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'requested_by' })
  requestedBy!: User;

  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'approved_by' })
  approvedBy?: User;

  @Column({
    name: 'original_payment_ledger_tx_id',
    type: 'uuid',
    nullable: true,
  })
  originalPaymentLedgerTxId?: string;

  @Column({ name: 'reversal_ledger_tx_id', type: 'uuid', nullable: true })
  reversalLedgerTxId?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
