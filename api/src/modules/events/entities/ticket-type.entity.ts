import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Event } from './event.entity';

@Entity({ schema: 'events', name: 'ticket_types' })
export class TicketType {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Event, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'event_id' })
  event!: Event;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ type: 'numeric', precision: 19, scale: 4 })
  price!: string;

  @Column({ type: 'char', length: 3 })
  currency!: string;

  @Column({ type: 'int' })
  capacity!: number;

  @Column({ name: 'sales_cutoff', type: 'timestamptz', nullable: true })
  salesCutoff?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;
}
