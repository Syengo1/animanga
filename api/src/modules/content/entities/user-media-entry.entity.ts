// C:\Projects\animanga-platform\api\src\modules\content\entities\user-media-entry.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { MediaItem } from './media-item.entity';
import { User } from '../../identity/entities/user.entity';

export type UserMediaStatus =
  | 'CURRENT'
  | 'PLANNING'
  | 'COMPLETED'
  | 'PAUSED'
  | 'DROPPED';

@Entity({ schema: 'content', name: 'user_media_entries' })
@Unique('uq_user_media_entry', ['userId', 'mediaId'])
export class UserMediaEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'media_id', type: 'uuid' })
  mediaId!: string;

  @ManyToOne(() => MediaItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'media_id' })
  mediaItem!: MediaItem;

  @Column({
    type: 'enum',
    enum: ['CURRENT', 'PLANNING', 'COMPLETED', 'PAUSED', 'DROPPED'],
    nullable: true,
  })
  status?: UserMediaStatus | null;

  @Column({ name: 'is_favorite', type: 'boolean', default: false })
  isFavorite!: boolean;

  @Column({ type: 'integer', default: 0 })
  progress!: number;

  @Column({ type: 'numeric', precision: 3, scale: 1, nullable: true })
  score?: string | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
