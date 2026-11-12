// C:\Projects\animanga-platform\api\src\modules\content\services\media-data.service.ts
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
import { AniListAdapter } from '../adapters/anilist/anilist.adapter';
import { MediaItem } from '../entities/media-item.entity';
import { MediaCardDto } from '../dto/discovery.dto';
import { CatalogQueryDto, CatalogPageResponse } from '../dto/catalog.dto';
import { MediaDetailDto, MediaDetailSchema } from '../dto/media-detail.dto';
import { getSeasonalContext } from '../utils/season.util';

@Injectable()
export class MediaDataService {
  private readonly logger = new Logger(MediaDataService.name);
  private readonly CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours for finished media
  private readonly AIRING_DETAIL_TTL_MS = 60 * 60 * 1000; // 1 hour for airing media

  constructor(
    private readonly primaryProvider: AniListAdapter,
    @InjectRepository(MediaItem)
    private readonly mediaRepo: Repository<MediaItem>,
  ) {}

  async syncMediaBatch(mediaList: CanonicalMedia[]): Promise<MediaItem[]> {
    if (!mediaList || mediaList.length === 0) return [];

    const uniqueMap = new Map<string, CanonicalMedia>();
    for (const media of mediaList) {
      uniqueMap.set(
        `${media.external.provider}:${media.external.externalId}`,
        media,
      );
    }
    const uniqueMedia = Array.from(uniqueMap.values());

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
        isAdult: Boolean(media.isAdult),
        sourceUpdatedAt: media.sourceUpdatedAt,
        lastSyncedAt: new Date(),
        nextAiringAt: media.nextAiringAt,
        nextAiringEpisode: media.nextAiringEpisode,
      }),
    );

    await this.mediaRepo.upsert(entities, ['provider', 'externalId']);

    const externalIds = uniqueMedia.map((m) => m.external.externalId);
    const savedItems = await this.mediaRepo.find({
      where: {
        provider: this.primaryProvider.providerName,
        externalId: In(externalIds),
      },
    });

    // Preserve incoming sort order for Discovery feeds
    const orderMap = new Map(savedItems.map((item) => [item.externalId, item]));
    return uniqueMedia
      .map((m) => orderMap.get(m.external.externalId))
      .filter((item): item is MediaItem => Boolean(item));
  }

  async getMediaById(
    provider: string,
    externalId: string,
    type?: MediaType,
  ): Promise<MediaItem | null> {
    const normalizedProvider = provider.toUpperCase();
    if (normalizedProvider !== this.primaryProvider.providerName) return null;

    const cached = await this.mediaRepo.findOne({
      where: {
        provider: normalizedProvider,
        externalId,
        ...(type ? { mediaType: type } : {}),
      },
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

  async fetchAndSyncCandidates(
    options: MediaCandidateOptions,
  ): Promise<MediaItem[]> {
    const freshData = await this.primaryProvider.getMediaCandidates(options);
    return this.syncMediaBatch(freshData);
  }

  async fetchTrends(
    options: MediaTrendOptions,
  ): Promise<CanonicalMediaTrend[]> {
    return this.primaryProvider.getMediaTrends(options);
  }

  async getCatalogPage(query: CatalogQueryDto): Promise<CatalogPageResponse> {
    const {
      type,
      sort,
      releaseState,
      status,
      season,
      year,
      format,
      genre,
      minEpisodes,
      maxEpisodes,
      search,
      limit,
      page,
    } = query;

    const qb = this.mediaRepo.createQueryBuilder('media');

    // 1. Base Constraints
    qb.where('media.mediaType = :type', { type });
    qb.andWhere('media.isAdult = false');

    // 2. Release State & Status Separation (Prevents mixing released & unreleased media)
    if (status) {
      qb.andWhere('media.status = :status', { status });
    } else if (releaseState === 'UNRELEASED') {
      qb.andWhere('media.status = :unreleasedStatus', {
        unreleasedStatus: 'NOT_YET_RELEASED',
      });
    } else if (releaseState === 'RELEASED') {
      qb.andWhere('media.status != :unreleasedStatus', {
        unreleasedStatus: 'NOT_YET_RELEASED',
      });
    }

    // 3. Format & Multi-Genre Filters
    if (format) {
      qb.andWhere('media.format = :format', { format });
    }

    if (genre) {
      const genresList = genre
        .split(',')
        .map((g) => g.trim())
        .filter(Boolean);
      if (genresList.length === 1) {
        qb.andWhere(':singleGenre = ANY(media.genres)', {
          singleGenre: genresList[0],
        });
      } else if (genresList.length > 1) {
        qb.andWhere('media.genres @> :genresList', { genresList });
      }
    }

    // 4. Episode / Chapter Count Range Filters
    const countColumn = type === 'MANGA' ? 'media.chapters' : 'media.episodes';
    if (minEpisodes !== undefined) {
      qb.andWhere(`${countColumn} >= :minEpisodes`, { minEpisodes });
    }
    if (maxEpisodes !== undefined) {
      qb.andWhere(`${countColumn} <= :maxEpisodes`, { maxEpisodes });
    }

    // 5. Dynamic Seasonal & Year Filters
    if (season === 'CURRENT') {
      const { currentSeason, currentYear } = getSeasonalContext();
      qb.andWhere('media.season = :season', { season: currentSeason });
      qb.andWhere('media.seasonYear = :year', { year: currentYear });
    } else {
      if (season) {
        qb.andWhere('media.season = :season', { season });
      }
      if (year) {
        qb.andWhere(
          '(media.seasonYear = :year OR EXTRACT(YEAR FROM media.startDate) = :year)',
          { year },
        );
      }
    }

    // 6. Smart Search Filter
    if (search) {
      qb.andWhere(
        '(media.titleEnglish ILIKE :search OR media.titleRomaji ILIKE :search OR media.titleNative ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // 7. Deterministic Sorting (id ASC acts as tie-breaker)
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
      case 'START_DATE_ASC':
        qb.orderBy('media.startDate', 'ASC', 'NULLS LAST').addOrderBy(
          'media.id',
          'ASC',
        );
        break;
      case 'TITLE_ASC':
        qb.orderBy(
          'LOWER(COALESCE(media.titleEnglish, media.titleRomaji, media.titleNative))',
          'ASC',
          'NULLS LAST',
        ).addOrderBy('media.id', 'ASC');
        break;
      case 'TITLE_DESC':
        qb.orderBy(
          'LOWER(COALESCE(media.titleEnglish, media.titleRomaji, media.titleNative))',
          'DESC',
          'NULLS LAST',
        ).addOrderBy('media.id', 'ASC');
        break;
      case 'EPISODES_DESC':
        qb.orderBy(countColumn, 'DESC', 'NULLS LAST').addOrderBy(
          'media.id',
          'ASC',
        );
        break;
      case 'EPISODES_ASC':
        qb.orderBy(countColumn, 'ASC', 'NULLS LAST').addOrderBy(
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

    // 8. Finite Offset/Limit Pagination
    const skip = (page - 1) * limit;
    qb.skip(skip).take(limit);

    const [rawRecords, totalItems] = await qb.getManyAndCount();
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));

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

  async getMediaDetailsDeep(
    internalOrExternalId: string,
  ): Promise<MediaDetailDto | null> {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        internalOrExternalId,
      );

    const qb = this.mediaRepo
      .createQueryBuilder('media')
      .where('media.provider = :provider', {
        provider: this.primaryProvider.providerName,
      });

    if (isUuid) {
      qb.andWhere('media.id = :id', { id: internalOrExternalId });
    } else {
      qb.andWhere('media.externalId = :id', { id: internalOrExternalId });
    }

    let media = await qb.getOne();

    // Auto-hydrate if a numeric AniList ID was requested (e.g. from Relations/Recommendations) but isn't in DB yet
    if (!media && !isUuid && /^\d+$/.test(internalOrExternalId)) {
      media = await this.getMediaById(
        this.primaryProvider.providerName,
        internalOrExternalId,
      );
    }

    if (!media) {
      return null;
    }

    // 1. Check JSONB Deep Detail Cache on MediaItem.providerMetadata
    const cachedMeta = media.providerMetadata as
      | { cachedAt?: number; detail?: unknown }
      | undefined;
    const ttl =
      media.status === 'RELEASING'
        ? this.AIRING_DETAIL_TTL_MS
        : this.CACHE_TTL_MS;

    if (
      cachedMeta?.cachedAt &&
      cachedMeta?.detail &&
      Date.now() - cachedMeta.cachedAt < ttl
    ) {
      const parsedCache = MediaDetailSchema.safeParse(cachedMeta.detail);
      if (parsedCache.success) {
        return parsedCache.data;
      }
    }

    // 2. Fetch fresh deep details from AniList and cache in PostgreSQL JSONB
    const deepDetail = await this.primaryProvider.getMediaDetailsDeep(
      Number(media.externalId),
      media.id,
    );

    await this.mediaRepo.update(
      { id: media.id },
      {
        providerMetadata: {
          cachedAt: Date.now(),
          detail: deepDetail,
        } as unknown as Record<string, unknown>,
        lastSyncedAt: new Date(),
      },
    );

    return deepDetail;
  }

  public mapToDto(item: MediaItem): MediaCardDto {
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
