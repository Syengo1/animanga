import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { MediaDiscoveryScore } from '../entities/media-discovery-score.entity';
import { MediaEditorialOverride } from '../entities/media-editorial-override.entity';
import { MediaDataService } from './media-data.service';
import { DiscoveryScoringService } from './discovery-scoring.service';
import { MediaItem } from '../entities/media-item.entity';
import {
  MediaCardDto,
  HomeDiscoveryResponseDto,
  DiscoveryFeed,
} from '../dto/discovery.dto';
import {
  MediaSeason,
  MediaCandidateOptions,
} from '../interfaces/media-provider.interface';

@Injectable()
export class DiscoveryEngineService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DiscoveryEngineService.name);

  constructor(
    private readonly mediaDataService: MediaDataService,
    private readonly scoringService: DiscoveryScoringService,
    @InjectRepository(MediaDiscoveryScore)
    private readonly scoreRepo: Repository<MediaDiscoveryScore>,
    @InjectRepository(MediaEditorialOverride)
    private readonly editorialRepo: Repository<MediaEditorialOverride>,
  ) {}

  // ==========================================================================
  // LIFECYCLE HOOK: Forces sync on deployment/startup
  // ==========================================================================
  onApplicationBootstrap(): void {
    this.logger.log(
      'Application bootstrap: Initiating discovery cache hydration...',
    );
    // We intentionally do not await this here so it doesn't block the HTTP server from binding to the port.
    // It will run silently in the background immediately after the server starts.
    this.refreshDiscoveryScores().catch((err: unknown) => {
      let errorMessage = 'Unknown error occurred';

      if (err instanceof Error) {
        errorMessage = err.stack || err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else {
        try {
          errorMessage = JSON.stringify(err);
        } catch {
          errorMessage = 'Un-stringifiable error object';
        }
      }

      this.logger.error(
        'Failed to hydrate discovery cache during bootstrap',
        errorMessage,
      );
    });
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

  // ==========================================================================
  // THE READ PATH (Executed ONLY by the API Controller)
  // Strictly reads from PostgreSQL. Zero upstream API calls.
  // ==========================================================================

  async getHomeDiscoveryFeeds(): Promise<HomeDiscoveryResponseDto> {
    const generatedAt = new Date().toISOString();

    const cachedScores = await this.scoreRepo.find({
      relations: { mediaItem: true },
      order: { rank: 'ASC' },
    });

    // O(N) single-pass grouping for optimal read-path performance
    const groupedShelves = cachedScores.reduce(
      (acc, score) => {
        if (!acc[score.feedKey]) acc[score.feedKey] = [];
        acc[score.feedKey].push(this.mapToDto(score.mediaItem));
        return acc;
      },
      {} as Record<string, MediaCardDto[]>,
    );

    const mapShelf = (feedKey: DiscoveryFeed) => groupedShelves[feedKey] || [];

    return {
      trendingThisWeek: {
        key: 'TRENDING_THIS_WEEK',
        title: 'Trending This Week',
        items: mapShelf('TRENDING_THIS_WEEK'),
        generatedAt,
      },
      newReleases: {
        key: 'NEW_RELEASES',
        title: 'New Releases',
        items: mapShelf('NEW_RELEASES'),
        generatedAt,
      },
      currentlyAiring: {
        key: 'CURRENTLY_AIRING',
        title: 'Currently Airing',
        items: mapShelf('CURRENTLY_AIRING'),
        generatedAt,
      },
      upcomingReleases: {
        key: 'UPCOMING_RELEASES',
        title: 'Upcoming Releases',
        items: mapShelf('UPCOMING_RELEASES'),
        generatedAt,
      },
      popularThisSeason: {
        key: 'POPULAR_THIS_SEASON',
        title: 'Popular This Season',
        items: mapShelf('POPULAR_THIS_SEASON'),
        generatedAt,
      },
    };
  }

  // ==========================================================================
  // THE WRITE PATH (Executed ONLY by the BullMQ Worker OR Bootstrap)
  // Fetches, synchronizes canonical facts, calculates scores, and caches results.
  // ==========================================================================

  async refreshDiscoveryScores(): Promise<void> {
    this.logger.log('Executing sequential background discovery refresh...');
    const limit = 15;

    // Isolated executions: If one feed fails (e.g., rate limits), others still update
    const tasks = [
      { name: 'Trending', fn: () => this.refreshTrendingThisWeek(limit) },
      { name: 'New Releases', fn: () => this.refreshNewReleases(limit) },
      {
        name: 'Currently Airing',
        fn: () => this.refreshCurrentlyAiring(limit),
      },
      {
        name: 'Popular This Season',
        fn: () => this.refreshPopularThisSeason(limit),
      },
      { name: 'Upcoming', fn: () => this.refreshUpcomingReleases(limit) },
    ];

    for (const task of tasks) {
      try {
        await task.fn();
      } catch (error) {
        const stackTrace = error instanceof Error ? error.stack : String(error);
        this.logger.error(`Failed to refresh ${task.name} feed:`, stackTrace);
      }
    }

    this.logger.log('Discovery cache refresh complete.');
  }

  private async saveScores(
    feedKey: DiscoveryFeed,
    algorithmVersion: string,
    items: Partial<MediaDiscoveryScore>[],
  ): Promise<void> {
    // Wrap write in a transaction to prevent race conditions during read-path queries
    await this.scoreRepo.manager.transaction(
      async (transactionalManager: EntityManager) => {
        await transactionalManager.delete(MediaDiscoveryScore, { feedKey });

        const entities = items.map((item) =>
          transactionalManager.create(MediaDiscoveryScore, {
            feedKey,
            algorithmVersion,
            ...item,
          }),
        );

        await transactionalManager.save(MediaDiscoveryScore, entities);
      },
    );
  }

  // --- Helper Methods ---

  private getFuzzyDateInt(date: Date, includeDay = true): number {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = includeDay ? String(date.getDate()).padStart(2, '0') : '00';
    return parseInt(`${year}${month}${day}`, 10);
  }

  private async fetchAndSaveNativeFeed(
    feedKey: DiscoveryFeed,
    queryCriteria: Omit<MediaCandidateOptions, 'limit'>,
    limit: number,
  ): Promise<void> {
    const candidates = await this.mediaDataService.fetchAndSyncCandidates({
      ...queryCriteria,
      limit,
    });

    await this.saveScores(
      feedKey,
      'native-v1',
      candidates.map((media, index) => ({
        mediaItem: media,
        rawPopularity: media.popularity || 0,
        finalScore: (limit - index).toString(),
        rank: index,
      })),
    );
  }

  // --- Feed Generators ---

  private async refreshUpcomingReleases(limit: number): Promise<void> {
    const todayInt = this.getFuzzyDateInt(new Date(), false);

    const candidates = await this.mediaDataService.fetchAndSyncCandidates({
      type: 'ANIME',
      status: 'NOT_YET_RELEASED',
      isAdult: false,
      startDateGreater: todayInt,
      sort: ['START_DATE', 'POPULARITY_DESC'],
      limit: 50,
    });

    const overrides = await this.editorialRepo.find({
      where: { feedKey: 'UPCOMING_RELEASES' },
      relations: { mediaItem: true },
    });

    const overrideMap = new Map(overrides.map((o) => [o.mediaItem.id, o]));

    const scored = candidates.map((media) => {
      const override = overrideMap.get(media.id);
      const multiplier = override ? parseFloat(override.multiplier) : 1.0;

      // Safety check: ensure startDate exists before calculating urgency
      const safeDate = media.startDate ? media.startDate : new Date();

      const scores = this.scoringService.calculateFinalUpcomingScore(
        media.popularity || 0,
        safeDate,
        multiplier,
      );
      return { media, ...scores };
    });

    scored.sort((a, b) => b.finalScore - a.finalScore);
    const topCandidates = scored.slice(0, limit);

    await this.saveScores(
      'UPCOMING_RELEASES',
      'upcoming-v1',
      topCandidates.map((s, index) => ({
        mediaItem: s.media,
        rawPopularity: s.media.popularity || 0,
        popularityScore: s.popScore.toString(),
        urgencyScore: s.urgScore.toString(),
        finalScore: s.finalScore.toString(),
        rank: index,
      })),
    );
  }

  private async refreshTrendingThisWeek(limit: number): Promise<void> {
    await this.fetchAndSaveNativeFeed(
      'TRENDING_THIS_WEEK',
      {
        type: 'ANIME',
        statusNot: 'NOT_YET_RELEASED',
        isAdult: false,
        sort: ['TRENDING_DESC'],
      },
      limit,
    );
  }

  private async refreshNewReleases(limit: number): Promise<void> {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const todayInt = this.getFuzzyDateInt(today);
    const pastInt = this.getFuzzyDateInt(thirtyDaysAgo);

    await this.fetchAndSaveNativeFeed(
      'NEW_RELEASES',
      {
        type: 'ANIME',
        isAdult: false,
        startDateGreater: pastInt,
        startDateLesser: todayInt,
        sort: ['START_DATE_DESC', 'POPULARITY_DESC'],
      },
      limit,
    );
  }

  private async refreshCurrentlyAiring(limit: number): Promise<void> {
    await this.fetchAndSaveNativeFeed(
      'CURRENTLY_AIRING',
      {
        type: 'ANIME',
        status: 'RELEASING',
        isAdult: false,
        sort: ['POPULARITY_DESC'],
      },
      limit,
    );
  }

  private getCurrentSeason(): { season: MediaSeason; year: number } {
    const month = new Date().getMonth();
    const year = new Date().getFullYear();
    if (month >= 0 && month <= 2) return { season: 'WINTER', year };
    if (month >= 3 && month <= 5) return { season: 'SPRING', year };
    if (month >= 6 && month <= 8) return { season: 'SUMMER', year };
    return { season: 'FALL', year };
  }

  private async refreshPopularThisSeason(limit: number): Promise<void> {
    const { season, year } = this.getCurrentSeason();

    await this.fetchAndSaveNativeFeed(
      'POPULAR_THIS_SEASON',
      {
        type: 'ANIME',
        season,
        seasonYear: year,
        isAdult: false,
        sort: ['POPULARITY_DESC'],
      },
      limit,
    );
  }
}
