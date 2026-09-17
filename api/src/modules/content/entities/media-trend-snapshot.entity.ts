import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Unique,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MediaItem } from './media-item.entity';

@Entity({ schema: 'content', name: 'media_trend_snapshots' })
@Unique('uq_provider_media_date', ['provider', 'mediaItem', 'snapshotDate'])
export class MediaTrendSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => MediaItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'media_id' })
  mediaItem!: MediaItem;

  @Column({ type: 'varchar', length: 50 })
  provider!: string;

  @Column({ name: 'snapshot_date', type: 'date' })
  snapshotDate!: string;

  @Column({ type: 'integer', default: 0 })
  trending!: number;

  @Column({ type: 'integer', default: 0 })
  popularity!: number;

  @Column({
    name: 'average_score',
    type: 'numeric',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  averageScore?: string;

  @Column({ name: 'in_progress', type: 'integer', default: 0 })
  inProgress!: number;

  @Column({ type: 'integer', default: 0 })
  releasing!: number;

  @Column({ type: 'integer', nullable: true })
  episode?: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
