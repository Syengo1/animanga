import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../identity/entities/user.entity';
import {
  ReconciliationStatus,
  ReconciliationException,
} from '../enums/integration.enums';

@Entity({ schema: 'integration', name: 'reconciliation_cases' })
export class ReconciliationCase {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: ReconciliationStatus,
    default: ReconciliationStatus.DISCOVERED,
  })
  status!: ReconciliationStatus;

  @Column({
    name: 'exception_category',
    type: 'enum',
    enum: ReconciliationException,
    nullable: true,
  })
  exceptionCategory?: ReconciliationException;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'resolved_by' })
  resolvedBy?: User;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
