import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MediaItem } from './media-item.entity';

@Entity({ schema: 'content', name: 'media_editorial_overrides' })
export class MediaEditorialOverride {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => MediaItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'media_id' })
  mediaItem!: MediaItem;

  @Column({ name: 'feed_key', type: 'varchar', length: 50 })
  feedKey!: string;

  @Column({ type: 'integer', default: 0 })
  weight!: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 1.0 })
  multiplier!: string;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @Column({ name: 'starts_at', type: 'timestamptz', nullable: true })
  startsAt?: Date;

  @Column({ name: 'ends_at', type: 'timestamptz', nullable: true })
  endsAt?: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
