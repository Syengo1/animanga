import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../identity/entities/user.entity';
import { Merchant } from './merchant.entity';
import {
  OrderPaymentStatus,
  FulfillmentStatus,
  OrderRefundStatus,
} from '../enums/commerce.enums';

@Entity({ schema: 'commerce', name: 'orders' })
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'order_number', type: 'varchar', length: 50, unique: true })
  orderNumber!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer!: User;

  @ManyToOne(() => Merchant, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'merchant_id' })
  merchant!: Merchant;

  // Strict precision mapping. Stored as string to prevent JS float dust.
  @Column({ name: 'gross_amount', type: 'numeric', precision: 19, scale: 4 })
  grossAmount!: string;

  @Column({ type: 'char', length: 3 })
  currency!: string;

  @Column({
    name: 'payment_status',
    type: 'enum',
    enum: OrderPaymentStatus,
    default: OrderPaymentStatus.UNPAID,
  })
  paymentStatus!: OrderPaymentStatus;

  @Column({
    name: 'fulfillment_status',
    type: 'enum',
    enum: FulfillmentStatus,
    default: FulfillmentStatus.UNFULFILLED,
  })
  fulfillmentStatus!: FulfillmentStatus;

  @Column({
    name: 'refund_status',
    type: 'enum',
    enum: OrderRefundStatus,
    default: OrderRefundStatus.NOT_REFUNDED,
  })
  refundStatus!: OrderRefundStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // STRICT NO DELETE
}
