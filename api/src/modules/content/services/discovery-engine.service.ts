import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
import { MediaSeason } from '../interfaces/media-provider.interface';

@Injectable()
export class DiscoveryEngineService {
  private readonly logger = new Logger(DiscoveryEngineService.name);

  constructor(
    private readonly mediaDataService: MediaDataService,
    private readonly scoringService: DiscoveryScoringService,
    @InjectRepository(MediaDiscoveryScore)
    private readonly scoreRepo: Repository<MediaDiscoveryScore>,
    @InjectRepository(MediaEditorialOverride)
    private readonly editorialRepo: Repository<MediaEditorialOverride>,
  ) {}

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
  // Strictly reads from PostgreSQL. Zero AniList API calls.
  // ==========================================================================

  async getHomeDiscoveryFeeds(): Promise<HomeDiscoveryResponseDto> {
    const generatedAt = new Date().toISOString();

    const cachedScores = await this.scoreRepo.find({
      relations: { mediaItem: true },
      order: { rank: 'ASC' },
    });

    const mapShelf = (feedKey: DiscoveryFeed) =>
      cachedScores
        .filter((s) => s.feedKey === feedKey)
        .map((s) => this.mapToDto(s.mediaItem));

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
  // THE WRITE PATH (Executed ONLY by the BullMQ Worker)
  // Fetches, synchronizes canonical facts, calculates scores, and caches results.
  // ==========================================================================

  async refreshDiscoveryScores(): Promise<void> {
    this.logger.log('Executing sequential background discovery refresh...');

    // Run sequentially to guarantee absolutely zero PostgreSQL lock contention
    await this.refreshTrendingThisWeek(15);
    await this.refreshNewReleases(15);
    await this.refreshCurrentlyAiring(15);
    await this.refreshPopularThisSeason(15);
    await this.refreshUpcomingReleases(15);

    this.logger.log('Discovery cache refresh complete.');
  }

  private async saveScores(
    feedKey: DiscoveryFeed,
    algorithmVersion: string,
    items: Partial<MediaDiscoveryScore>[],
  ) {
    // Purge old rankings for this feed so dropped media instantly disappears
    await this.scoreRepo.delete({ feedKey });

    const entities = items.map((item) =>
      this.scoreRepo.create({
        feedKey,
        algorithmVersion,
        ...item,
      }),
    );

    await this.scoreRepo.save(entities);
  }

  private async refreshUpcomingReleases(limit: number): Promise<void> {
    const today = new Date();
    const todayInt = parseInt(
      `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}00`,
      10,
    );

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
      const scores = this.scoringService.calculateFinalUpcomingScore(
        media.popularity || 0,
        media.startDate,
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
    const candidates = await this.mediaDataService.fetchAndSyncCandidates({
      type: 'ANIME',
      statusNot: 'NOT_YET_RELEASED',
      isAdult: false,
      sort: ['TRENDING_DESC'],
      limit,
    });

    await this.saveScores(
      'TRENDING_THIS_WEEK',
      'native-v1',
      candidates.map((media, index) => ({
        mediaItem: media,
        rawPopularity: media.popularity || 0,
        finalScore: (limit - index).toString(),
        rank: index,
      })),
    );
  }

  private async refreshNewReleases(limit: number): Promise<void> {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const todayInt = parseInt(
      `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`,
      10,
    );
    const pastInt = parseInt(
      `${thirtyDaysAgo.getFullYear()}${String(thirtyDaysAgo.getMonth() + 1).padStart(2, '0')}${String(thirtyDaysAgo.getDate()).padStart(2, '0')}`,
      10,
    );

    const candidates = await this.mediaDataService.fetchAndSyncCandidates({
      type: 'ANIME',
      isAdult: false,
      startDateGreater: pastInt,
      startDateLesser: todayInt,
      sort: ['START_DATE_DESC', 'POPULARITY_DESC'],
      limit,
    });

    await this.saveScores(
      'NEW_RELEASES',
      'native-v1',
      candidates.map((media, index) => ({
        mediaItem: media,
        rawPopularity: media.popularity || 0,
        finalScore: (limit - index).toString(),
        rank: index,
      })),
    );
  }

  private async refreshCurrentlyAiring(limit: number): Promise<void> {
    const candidates = await this.mediaDataService.fetchAndSyncCandidates({
      type: 'ANIME',
      status: 'RELEASING',
      isAdult: false,
      sort: ['POPULARITY_DESC'],
      limit,
    });

    await this.saveScores(
      'CURRENTLY_AIRING',
      'native-v1',
      candidates.map((media, index) => ({
        mediaItem: media,
        rawPopularity: media.popularity || 0,
        finalScore: (limit - index).toString(),
        rank: index,
      })),
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
    const candidates = await this.mediaDataService.fetchAndSyncCandidates({
      type: 'ANIME',
      season,
      seasonYear: year,
      isAdult: false,
      sort: ['POPULARITY_DESC'],
      limit,
    });

    await this.saveScores(
      'POPULAR_THIS_SEASON',
      'native-v1',
      candidates.map((media, index) => ({
        mediaItem: media,
        rawPopularity: media.popularity || 0,
        finalScore: (limit - index).toString(),
        rank: index,
      })),
    );
  }
}
