import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  CanonicalMedia,
  MediaType,
  MediaCandidateOptions,
  MediaTrendOptions,
  CanonicalMediaTrend,
} from '../interfaces/media-provider.interface';
import { AniListAdapter } from '../adapters/anilist.adapter';
import { MediaItem } from '../entities/media-item.entity';

@Injectable()
export class MediaDataService {
  private readonly logger = new Logger(MediaDataService.name);
  private readonly CACHE_TTL_MS = 24 * 60 * 60 * 1000;

  constructor(
    private readonly primaryProvider: AniListAdapter,
    @InjectRepository(MediaItem)
    private readonly mediaRepo: Repository<MediaItem>,
  ) {}

  /**
   * 1. Core Synchronization
   * Upserts raw provider facts into the canonical media_items table.
   */
  async syncMediaBatch(mediaList: CanonicalMedia[]): Promise<MediaItem[]> {
    if (!mediaList || mediaList.length === 0) return [];

    // 1. Deduplicate the incoming batch
    const uniqueMap = new Map<string, CanonicalMedia>();
    for (const media of mediaList) {
      uniqueMap.set(
        `${media.external.provider}:${media.external.externalId}`,
        media,
      );
    }
    const uniqueMedia = Array.from(uniqueMap.values());

    // 2. Deterministic sort to prevent PostgreSQL UPSERT deadlocks
    uniqueMedia.sort((a, b) =>
      `${a.external.provider}:${a.external.externalId}`.localeCompare(
        `${b.external.provider}:${b.external.externalId}`,
      ),
    );

    const entities = uniqueMedia.map((media) =>
      this.mediaRepo.create({
        provider: media.external.provider,
        externalId: media.external.externalId,
        mediaType: media.type,
        format: media.format,
        titleEnglish: media.title.english,
        titleRomaji: media.title.romaji,
        titleNative: media.title.native,
        synopsis: media.synopsis,
        status: media.status,
        season: media.season || undefined,
        seasonYear: media.seasonYear,
        startDate: media.startDate,
        endDate: media.endDate,
        duration: media.duration,
        coverImageUrl: media.coverImageUrl,
        bannerImageUrl: media.bannerImageUrl,
        colorHex: media.colorHex,
        episodes: media.episodes,
        chapters: media.chapters,
        volumes: media.volumes,
        genres: media.genres,
        averageScore: media.averageScore?.toString(),
        popularity: media.popularity,
        isAdult: media.isAdult,
        sourceUpdatedAt: media.sourceUpdatedAt,
        lastSyncedAt: new Date(),
      }),
    );

    // Errors are intentionally uncaught here so the upstream BullMQ worker can trigger a retry
    await this.mediaRepo.upsert(entities, ['provider', 'externalId']);

    const externalIds = uniqueMedia.map((m) => m.external.externalId);
    return this.mediaRepo.find({
      where: {
        provider: this.primaryProvider.providerName,
        externalId: In(externalIds),
      },
    });
  }

  /**
   * 2. Read / Sync by ID
   * Fetches a single canonical record. If stale or missing, fetches from the provider.
   */
  async getMediaById(
    provider: string,
    externalId: string,
    type?: MediaType,
  ): Promise<MediaItem | null> {
    if (provider !== this.primaryProvider.providerName) return null;

    const cached = await this.mediaRepo.findOne({
      where: { provider, externalId, mediaType: type },
    });

    if (
      cached &&
      cached.lastSyncedAt &&
      Date.now() - cached.lastSyncedAt.getTime() < this.CACHE_TTL_MS
    ) {
      return cached;
    }

    const freshData = await this.primaryProvider.getMediaByIds(
      [externalId],
      type,
    );
    if (freshData && freshData.length > 0) {
      const synced = await this.syncMediaBatch(freshData);
      return synced[0] || null;
    }

    return cached || null;
  }

  /**
   * 3. Fetch Candidates
   * Used by the Discovery Engine to pull new candidate pools (e.g. unreleased shows, current season).
   */
  async fetchAndSyncCandidates(
    options: MediaCandidateOptions,
  ): Promise<MediaItem[]> {
    const freshData = await this.primaryProvider.getMediaCandidates(options);
    return this.syncMediaBatch(freshData);
  }

  /**
   * 4. Fetch Trends
   * Used by the Discovery Engine / Worker to pull daily velocity metrics.
   */
  async fetchTrends(
    options: MediaTrendOptions,
  ): Promise<CanonicalMediaTrend[]> {
    return this.primaryProvider.getMediaTrends(options);
  }
}
