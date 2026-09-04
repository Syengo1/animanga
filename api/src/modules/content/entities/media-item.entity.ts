import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import {
  MediaSeason,
  MediaStatus,
  MediaType,
} from '../interfaces/media-provider.interface';

@Entity({ schema: 'content', name: 'media_items' })
@Index(['provider', 'externalId'], { unique: true })
export class MediaItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50 })
  provider!: string;

  @Column({ name: 'external_id', type: 'varchar', length: 100 })
  externalId!: string;

  @Column({
    name: 'media_type',
    type: 'enum',
    enum: ['ANIME', 'MANGA'],
  })
  mediaType!: MediaType;

  @Column({
    name: 'title_romaji',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  titleRomaji?: string;

  @Column({
    name: 'title_english',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  titleEnglish?: string;

  @Column({
    name: 'title_native',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  titleNative?: string;

  @Column({ type: 'text', nullable: true })
  synopsis?: string;

  @Column({
    type: 'enum',
    enum: [
      'FINISHED',
      'RELEASING',
      'NOT_YET_RELEASED',
      'CANCELLED',
      'HIATUS',
      'UNKNOWN',
    ],
    default: 'UNKNOWN',
  })
  status!: MediaStatus;

  @Column({
    type: 'enum',
    enum: ['WINTER', 'SPRING', 'SUMMER', 'FALL'],
    nullable: true,
  })
  season!: Exclude<MediaSeason, null>;

  @Column({ name: 'season_year', type: 'integer', nullable: true })
  seasonYear?: number;

  @Column({ name: 'cover_image_url', type: 'text', nullable: true })
  coverImageUrl?: string;

  @Column({ name: 'banner_image_url', type: 'text', nullable: true })
  bannerImageUrl?: string;

  @Column({ name: 'color_hex', type: 'varchar', length: 20, nullable: true })
  colorHex?: string;

  @Column({ type: 'integer', nullable: true })
  episodes?: number;

  @Column({ type: 'integer', nullable: true })
  chapters?: number;

  @Column({ type: 'integer', nullable: true })
  volumes?: number;

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  genres!: string[];

  @Column({
    name: 'average_score',
    type: 'numeric',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  averageScore?: string;

  @Column({
    name: 'source_updated_at',
    type: 'timestamptz',
    nullable: true,
  })
  sourceUpdatedAt?: Date;

  @Column({
    name: 'last_synced_at',
    type: 'timestamptz',
    nullable: true,
  })
  lastSyncedAt?: Date;

  @Column({
    name: 'provider_metadata',
    type: 'jsonb',
    nullable: true,
  })
  providerMetadata?: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
