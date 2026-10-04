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
import { MediaCardDto } from '../dto/discovery.dto';
import { CatalogQueryDto, CatalogPageResponse } from '../dto/catalog.dto';

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
        nextAiringAt: media.nextAiringAt,
        nextAiringEpisode: media.nextAiringEpisode,
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

  /**
   * 5. Catalog Engine (Offset/Page Pagination)
   * High-performance deterministic read path for the frontend numbered pagination grids.
   */
  async getCatalogPage(query: CatalogQueryDto): Promise<CatalogPageResponse> {
    // FIX: Destructure 'page' and 'season' instead of 'cursor'
    const { type, sort, status, season, format, genre, search, limit, page } =
      query;
    const qb = this.mediaRepo.createQueryBuilder('media');

    // 1. Base Constraints
    qb.where('media.mediaType = :type', { type });
    qb.andWhere('media.isAdult = false');

    // 2. Exact Filters
    if (status) qb.andWhere('media.status = :status', { status });
    if (format) qb.andWhere('media.format = :format', { format });
    if (genre) qb.andWhere(':genre = ANY(media.genres)', { genre });
    if (search) {
      qb.andWhere(
        '(media.titleEnglish ILIKE :search OR media.titleRomaji ILIKE :search OR media.titleNative ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // 3. Dynamic Seasonal Filters
    if (season === 'CURRENT') {
      const current = this.getCurrentSeason();
      qb.andWhere('media.season = :season', { season: current.season });
      qb.andWhere('media.seasonYear = :year', { year: current.year });
    } else if (season) {
      qb.andWhere('media.season = :season', { season });
    }

    // 4. Deterministic Sorting (id ASC acts as the absolute tie-breaker)
    // FIX: Removed all cursor logic
    switch (sort) {
      case 'SCORE_DESC':
        qb.orderBy('media.averageScore', 'DESC', 'NULLS LAST').addOrderBy(
          'media.id',
          'ASC',
        );
        break;

      case 'START_DATE_DESC':
        qb.orderBy('media.startDate', 'DESC', 'NULLS LAST').addOrderBy(
          'media.id',
          'ASC',
        );
        break;

      case 'POPULARITY_DESC':
      case 'TRENDING_DESC':
      default:
        qb.orderBy('media.popularity', 'DESC', 'NULLS LAST').addOrderBy(
          'media.id',
          'ASC',
        );
        break;
    }

    // 5. Offset/Limit Pagination
    const skip = (page - 1) * limit;
    qb.skip(skip).take(limit);

    // 6. Execute & Count
    const [rawRecords, totalItems] = await qb.getManyAndCount();

    // Calculate total pages safely (ensuring at least 1 page exists)
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));

    // 7. Return matching DTO
    return {
      items: rawRecords.map((item) => this.mapToDto(item)),
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        limit,
      },
    };
  }

  // Utility to determine the active Anime season
  private getCurrentSeason(): { season: string; year: number } {
    const month = new Date().getMonth();
    const year = new Date().getFullYear();

    if (month >= 0 && month <= 2) return { season: 'WINTER', year };
    if (month >= 3 && month <= 5) return { season: 'SPRING', year };
    if (month >= 6 && month <= 8) return { season: 'SUMMER', year };
    return { season: 'FALL', year };
  }

  private mapToDto(item: MediaItem): MediaCardDto {
    return {
      id: item.id,
      providerId: item.externalId,
      provider: item.provider,
      title: {
        english: item.titleEnglish ?? null,
        romaji: item.titleRomaji ?? null,
        native: item.titleNative ?? null,
      },
      coverImage: {
        extraLarge: item.coverImageUrl ?? null,
        large: item.coverImageUrl ?? null,
        color: item.colorHex ?? null,
      },
      bannerImage: item.bannerImageUrl ?? null,
      colorHex: item.colorHex ?? null,
      status: item.status ?? null,
      format: item.format ?? null,
      episodes: item.episodes ?? null,
      chapters: item.chapters ?? null,
      volumes: item.volumes ?? null,
      season: item.season ?? null,
      seasonYear: item.seasonYear ?? null,
      averageScore: item.averageScore ? Number(item.averageScore) : null,
      popularity: item.popularity ?? null,
      startDate: item.startDate?.toISOString() ?? null,
      endDate: item.endDate?.toISOString() ?? null,
    };
  }
}
