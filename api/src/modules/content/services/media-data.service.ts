// C:\Projects\animanga-platform\api\src\modules\content\services\media-data.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, SelectQueryBuilder } from 'typeorm';
import {
  CanonicalMedia,
  MediaType,
  MediaSeason,
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

interface CachedCatalogPage {
  expiresAt: number;
  response: CatalogPageResponse;
}

@Injectable()
export class MediaDataService {
  private readonly logger = new Logger(MediaDataService.name);
  private readonly CACHE_TTL_MS = 24 * 60 * 60 * 1000;
  private readonly AIRING_DETAIL_TTL_MS = 60 * 60 * 1000;
  private readonly PAGE_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
  private readonly MAX_CACHED_PAGES = 500;

  // Deterministic Page Cache & In-Flight Request Deduplication
  private readonly catalogPageCache = new Map<string, CachedCatalogPage>();
  private readonly inFlightPageRequests = new Map<
    string,
    Promise<CatalogPageResponse>
  >();

  constructor(
    private readonly primaryProvider: AniListAdapter,
    @InjectRepository(MediaItem)
    private readonly mediaRepo: Repository<MediaItem>,
  ) {}

  async syncMediaBatch(mediaList: CanonicalMedia[]): Promise<MediaItem[]> {
    if (!mediaList || mediaList.length === 0) return [];

    // Preserve the exact incoming order for return, while deduplicating by provider:externalId
    const orderedKeys: string[] = [];
    const uniqueMap = new Map<string, CanonicalMedia>();

    for (const media of mediaList) {
      const key = `${media.external.provider}:${media.external.externalId}`;
      if (!uniqueMap.has(key)) {
        orderedKeys.push(media.external.externalId);
      }
      uniqueMap.set(key, media);
    }

    // Sort only the upsert payload alphabetically to prevent PostgreSQL row-lock deadlocks
    const sortedForUpsert = Array.from(uniqueMap.values()).sort((a, b) =>
      `${a.external.provider}:${a.external.externalId}`.localeCompare(
        `${b.external.provider}:${b.external.externalId}`,
      ),
    );

    const entities = sortedForUpsert.map((media) =>
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

    const savedItems = await this.mediaRepo.find({
      where: {
        provider: this.primaryProvider.providerName,
        externalId: In(orderedKeys),
      },
    });

    const orderMap = new Map(savedItems.map((item) => [item.externalId, item]));

    // Return entities in the EXACT upstream sort order (critical for pagination stability)
    return orderedKeys
      .map((extId) => orderMap.get(extId))
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

  /**
   * Maps catalog sort enum to AniList MediaSort with a mandatory 'ID_DESC'
   * tie-breaker so tied scores/dates/popularities never repeat across pages.
   */
  private mapCatalogSortToAniList(
    sort: CatalogQueryDto['sort'],
    type: MediaType,
  ): string[] {
    switch (sort) {
      case 'SCORE_DESC':
        return ['SCORE_DESC', 'POPULARITY_DESC', 'ID_DESC'];
      case 'START_DATE_DESC':
        return ['START_DATE_DESC', 'POPULARITY_DESC', 'ID_DESC'];
      case 'START_DATE_ASC':
        return ['START_DATE', 'POPULARITY_DESC', 'ID_DESC'];
      case 'TITLE_ASC':
        return ['TITLE_ROMAJI', 'ID_DESC'];
      case 'TITLE_DESC':
        return ['TITLE_ROMAJI_DESC', 'ID_DESC'];
      case 'EPISODES_DESC':
        return type === 'MANGA'
          ? ['CHAPTERS_DESC', 'POPULARITY_DESC', 'ID_DESC']
          : ['EPISODES_DESC', 'POPULARITY_DESC', 'ID_DESC'];
      case 'EPISODES_ASC':
        return type === 'MANGA'
          ? ['CHAPTERS', 'POPULARITY_DESC', 'ID_DESC']
          : ['EPISODES', 'POPULARITY_DESC', 'ID_DESC'];
      case 'TRENDING_DESC':
        return ['TRENDING_DESC', 'POPULARITY_DESC', 'ID_DESC'];
      case 'POPULARITY_DESC':
      default:
        return ['POPULARITY_DESC', 'ID_DESC'];
    }
  }

  private buildCandidateOptionsFromCatalogQuery(
    query: CatalogQueryDto,
  ): MediaCandidateOptions {
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

    const { currentSeason, currentYear } = getSeasonalContext();
    const resolvedSeason: MediaSeason =
      season === 'CURRENT' ? currentSeason : (season as MediaSeason) || null;
    const resolvedYear = season === 'CURRENT' ? currentYear : year;

    const genresList = genre
      ? genre
          .split(',')
          .map((g) => g.trim())
          .filter(Boolean)
      : undefined;

    // If year is specified without season (and not CURRENT), bound by startDate range
    const startDateGreater =
      !season && resolvedYear ? resolvedYear * 10000 : undefined;
    const startDateLesser =
      !season && resolvedYear ? (resolvedYear + 1) * 10000 : undefined;

    return {
      type,
      sort: this.mapCatalogSortToAniList(sort, type),
      status:
        status ||
        (releaseState === 'UNRELEASED' ? 'NOT_YET_RELEASED' : undefined),
      statusNot:
        !status && releaseState === 'RELEASED' ? 'NOT_YET_RELEASED' : undefined,
      format,
      genres: genresList,
      season: resolvedSeason,
      seasonYear: season ? resolvedYear : undefined,
      startDateGreater,
      startDateLesser,
      ...(type === 'ANIME'
        ? {
            episodesGreater:
              minEpisodes !== undefined
                ? Math.max(0, minEpisodes - 1)
                : undefined,
            episodesLesser:
              maxEpisodes !== undefined ? maxEpisodes + 1 : undefined,
          }
        : {
            chaptersGreater:
              minEpisodes !== undefined
                ? Math.max(0, minEpisodes - 1)
                : undefined,
            chaptersLesser:
              maxEpisodes !== undefined ? maxEpisodes + 1 : undefined,
          }),
      search: search?.trim() || undefined,
      page,
      limit,
      isAdult: false,
    };
  }

  private getCatalogCacheKey(query: CatalogQueryDto): string {
    return JSON.stringify({
      type: query.type,
      sort: query.sort,
      releaseState: query.releaseState,
      status: query.status || null,
      season: query.season || null,
      year: query.year || null,
      format: query.format || null,
      genre: query.genre || null,
      minEpisodes: query.minEpisodes ?? null,
      maxEpisodes: query.maxEpisodes ?? null,
      search: query.search?.toLowerCase().trim() || null,
      limit: query.limit,
      page: query.page,
    });
  }

  private setPageCache(key: string, response: CatalogPageResponse): void {
    if (this.catalogPageCache.size >= this.MAX_CACHED_PAGES) {
      const oldest = this.catalogPageCache.keys().next();
      if (!oldest.done) {
        this.catalogPageCache.delete(oldest.value);
      }
    }
    this.catalogPageCache.set(key, {
      expiresAt: Date.now() + this.PAGE_CACHE_TTL_MS,
      response,
    });
  }

  /**
   * Fetches the exact page window from AniList, persists the entities to PostgreSQL
   * in a single batch upsert, and returns the exact ordered items for that page.
   */
  private async fetchAndCacheCatalogPage(
    query: CatalogQueryDto,
    cacheKey: string,
  ): Promise<CatalogPageResponse> {
    const existingInFlight = this.inFlightPageRequests.get(cacheKey);
    if (existingInFlight !== undefined) {
      return existingInFlight;
    }

    const requestPromise = (async (): Promise<CatalogPageResponse> => {
      try {
        const candidateOptions =
          this.buildCandidateOptionsFromCatalogQuery(query);
        const upstreamPage =
          await this.primaryProvider.getMediaCatalogPage(candidateOptions);

        const syncedEntities = await this.syncMediaBatch(upstreamPage.items);

        // Estimate totalItems cleanly when AniList caps its pageInfo.total at 5000
        const totalItems = Math.max(
          upstreamPage.pageInfo.total,
          syncedEntities.length > 0
            ? (query.page - 1) * query.limit + syncedEntities.length
            : 0,
        );
        const totalPages = Math.max(
          1,
          upstreamPage.pageInfo.lastPage || Math.ceil(totalItems / query.limit),
        );

        const response: CatalogPageResponse = {
          items: syncedEntities.map((item) => this.mapToDto(item)),
          pagination: {
            currentPage: query.page,
            totalPages,
            totalItems,
            limit: query.limit,
          },
        };

        this.setPageCache(cacheKey, response);
        return response;
      } finally {
        this.inFlightPageRequests.delete(cacheKey);
      }
    })();

    this.inFlightPageRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  private buildCatalogQueryBuilder(
    query: CatalogQueryDto,
  ): SelectQueryBuilder<MediaItem> {
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
    } = query;

    const qb = this.mediaRepo.createQueryBuilder('media');

    qb.where('media.mediaType = :type', { type });
    qb.andWhere('media.isAdult = false');

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

    const countColumn = type === 'MANGA' ? 'media.chapters' : 'media.episodes';
    if (minEpisodes !== undefined) {
      qb.andWhere(`${countColumn} >= :minEpisodes`, { minEpisodes });
    }
    if (maxEpisodes !== undefined) {
      qb.andWhere(`${countColumn} <= :maxEpisodes`, { maxEpisodes });
    }

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

    if (search) {
      qb.andWhere(
        '(media.titleEnglish ILIKE :search OR media.titleRomaji ILIKE :search OR media.titleNative ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    switch (sort) {
      case 'SCORE_DESC':
        qb.orderBy('media.averageScore', 'DESC', 'NULLS LAST')
          .addOrderBy('media.popularity', 'DESC', 'NULLS LAST')
          .addOrderBy('media.externalId', 'DESC');
        break;
      case 'START_DATE_DESC':
        qb.orderBy('media.startDate', 'DESC', 'NULLS LAST')
          .addOrderBy('media.popularity', 'DESC', 'NULLS LAST')
          .addOrderBy('media.externalId', 'DESC');
        break;
      case 'START_DATE_ASC':
        qb.orderBy('media.startDate', 'ASC', 'NULLS LAST')
          .addOrderBy('media.popularity', 'DESC', 'NULLS LAST')
          .addOrderBy('media.externalId', 'DESC');
        break;
      case 'TITLE_ASC':
        qb.orderBy(
          'LOWER(COALESCE(media.titleRomaji, media.titleEnglish, media.titleNative))',
          'ASC',
          'NULLS LAST',
        ).addOrderBy('media.externalId', 'DESC');
        break;
      case 'TITLE_DESC':
        qb.orderBy(
          'LOWER(COALESCE(media.titleRomaji, media.titleEnglish, media.titleNative))',
          'DESC',
          'NULLS LAST',
        ).addOrderBy('media.externalId', 'DESC');
        break;
      case 'EPISODES_DESC':
        qb.orderBy(countColumn, 'DESC', 'NULLS LAST')
          .addOrderBy('media.popularity', 'DESC', 'NULLS LAST')
          .addOrderBy('media.externalId', 'DESC');
        break;
      case 'EPISODES_ASC':
        qb.orderBy(countColumn, 'ASC', 'NULLS LAST')
          .addOrderBy('media.popularity', 'DESC', 'NULLS LAST')
          .addOrderBy('media.externalId', 'DESC');
        break;
      case 'POPULARITY_DESC':
      case 'TRENDING_DESC':
      default:
        qb.orderBy('media.popularity', 'DESC', 'NULLS LAST').addOrderBy(
          'media.externalId',
          'DESC',
        );
        break;
    }

    return qb;
  }

  async getCatalogPage(query: CatalogQueryDto): Promise<CatalogPageResponse> {
    const cacheKey = this.getCatalogCacheKey(query);
    const cached = this.catalogPageCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      // Trigger non-blocking background prefetch of the next page if not yet cached
      this.prefetchNextPages(query, cached.response.pagination.totalPages);
      return cached.response;
    }

    try {
      const response = await this.fetchAndCacheCatalogPage(query, cacheKey);

      // Non-blocking background prefetch of page + 1 so clicking "Next Page" is instant
      this.prefetchNextPages(query, response.pagination.totalPages);

      return response;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `Upstream catalog page fetch failed (${msg}). Falling back to local PostgreSQL.`,
      );

      const { limit, page } = query;
      const skip = (page - 1) * limit;
      const qb = this.buildCatalogQueryBuilder(query).offset(skip).limit(limit);
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
  }

  /**
   * Non-blocking background prefetch of page + 1 so sequential "Next Page" navigation
   * resolves in <1ms from memory while also hydrating PostgreSQL ahead of the user.
   */
  private prefetchNextPages(query: CatalogQueryDto, totalPages: number): void {
    const nextPage = query.page + 1;
    if (nextPage > totalPages) return;

    const nextQuery: CatalogQueryDto = { ...query, page: nextPage };
    const nextKey = this.getCatalogCacheKey(nextQuery);
    const cachedNext = this.catalogPageCache.get(nextKey);

    if (
      (cachedNext && cachedNext.expiresAt > Date.now()) ||
      this.inFlightPageRequests.has(nextKey)
    ) {
      return;
    }

    void this.fetchAndCacheCatalogPage(nextQuery, nextKey).catch(() => {
      // Silently ignore background prefetch errors
    });
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

    if (!media && !isUuid && /^\d+$/.test(internalOrExternalId)) {
      media = await this.getMediaById(
        this.primaryProvider.providerName,
        internalOrExternalId,
      );
    }

    if (!media) {
      return null;
    }

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
