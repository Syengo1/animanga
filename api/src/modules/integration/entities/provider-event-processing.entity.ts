import {
  Entity,
  PrimaryColumn,
  Column,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { ProviderEvent } from './provider-event.entity';

export enum ProviderEventProcessingStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
  DEAD_LETTER = 'DEAD_LETTER',
}

@Entity({ schema: 'integration', name: 'provider_event_processing' })
export class ProviderEventProcessing {
  @PrimaryColumn({ name: 'provider_event_id', type: 'uuid' })
  providerEventId!: string;

  @OneToOne(() => ProviderEvent, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'provider_event_id' })
  providerEvent!: ProviderEvent;

  @Column({
    type: 'enum',
    enum: ProviderEventProcessingStatus,
    default: ProviderEventProcessingStatus.PENDING,
  })
  status!: ProviderEventProcessingStatus;

  @Column({ name: 'attempt_count', type: 'int', default: 0 })
  attemptCount!: number;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt?: Date;

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt?: Date;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError?: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
