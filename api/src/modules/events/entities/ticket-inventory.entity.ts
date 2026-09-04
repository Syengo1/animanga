import {
  Entity,
  Column,
  UpdateDateColumn,
  VersionColumn,
  OneToOne,
  JoinColumn,
  PrimaryColumn,
} from 'typeorm';
import { TicketType } from './ticket-type.entity';

@Entity({ schema: 'events', name: 'ticket_inventory' })
export class TicketInventory {
  @PrimaryColumn('uuid', { name: 'ticket_type_id' })
  ticketTypeId!: string;

  @OneToOne(() => TicketType, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'ticket_type_id' })
  ticketType!: TicketType;

  @Column({ type: 'int' })
  capacity!: number;

  @Column({ name: 'available_quantity', type: 'int' })
  availableQuantity!: number;

  @Column({ name: 'reserved_quantity', type: 'int', default: 0 })
  reservedQuantity!: number;

  @Column({ name: 'sold_quantity', type: 'int', default: 0 })
  soldQuantity!: number;

  // Audit tracking metadata
  @VersionColumn()
  version!: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
