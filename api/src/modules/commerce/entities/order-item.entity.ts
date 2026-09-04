import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { OrderItemType } from '../enums/commerce.enums';

@Entity({ schema: 'commerce', name: 'order_items' })
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Order, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @Column({ name: 'item_type', type: 'enum', enum: OrderItemType })
  itemType!: OrderItemType;

  @Column({ name: 'item_id', type: 'uuid' })
  itemId!: string;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ name: 'price_per_unit', type: 'numeric', precision: 19, scale: 4 })
  pricePerUnit!: string;

  @Column({ type: 'char', length: 3 })
  currency!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
