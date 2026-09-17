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

@Entity({ schema: 'content', name: 'media_discovery_scores' })
@Unique('uq_media_feed', ['mediaItem', 'feedKey'])
export class MediaDiscoveryScore {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => MediaItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'media_id' })
  mediaItem!: MediaItem;

  @Column({ name: 'feed_key', type: 'varchar', length: 50 })
  feedKey!: string;

  @Column({ name: 'algorithm_version', type: 'varchar', length: 50 })
  algorithmVersion!: string;

  @Column({ name: 'raw_popularity', type: 'integer', default: 0 })
  rawPopularity!: number;

  @Column({
    name: 'popularity_score',
    type: 'numeric',
    precision: 5,
    scale: 4,
    default: 0,
  })
  popularityScore!: string;

  @Column({
    name: 'urgency_score',
    type: 'numeric',
    precision: 5,
    scale: 4,
    default: 0,
  })
  urgencyScore!: string;

  @Column({
    name: 'recency_score',
    type: 'numeric',
    precision: 5,
    scale: 4,
    default: 0,
  })
  recencyScore!: string;

  @Column({
    name: 'trend_score',
    type: 'numeric',
    precision: 5,
    scale: 4,
    default: 0,
  })
  trendScore!: string;

  @Column({
    name: 'editorial_score',
    type: 'numeric',
    precision: 5,
    scale: 4,
    default: 0,
  })
  editorialScore!: string;

  @Column({
    name: 'final_score',
    type: 'numeric',
    precision: 8,
    scale: 4,
    default: 0,
  })
  finalScore!: string;

  @Column({ type: 'integer', nullable: true })
  rank?: number;

  @CreateDateColumn({ name: 'calculated_at', type: 'timestamptz' })
  calculatedAt!: Date;

  @Column({ name: 'valid_until', type: 'timestamptz', nullable: true })
  validUntil?: Date;
}
