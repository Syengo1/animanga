// C:\Projects\animanga-platform\api\src\modules\content\workers\content-sync.worker.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MediaItem } from '../entities/media-item.entity';
import { MediaDataService } from '../services/media-data.service';
import { DiscoveryEngineService } from '../services/discovery-engine.service';
import { AniListAdapter } from '../adapters/anilist/anilist.adapter';

@Processor('content-sync', { concurrency: 1 })
export class ContentSyncWorker extends WorkerHost {
  private readonly logger = new Logger(ContentSyncWorker.name);
  private readonly BATCH_SIZE = parseInt(
    process.env.ANILIST_SYNC_BATCH_SIZE || '50',
    10,
  );
  private readonly DEEP_CRAWL_PAGES = parseInt(
    process.env.ANILIST_DEEP_CRAWL_PAGES || '20',
    10,
  );

  constructor(
    @InjectRepository(MediaItem)
    private readonly mediaRepo: Repository<MediaItem>,
    private readonly mediaDataService: MediaDataService,
    private readonly discoveryEngine: DiscoveryEngineService,
    private readonly anilistAdapter: AniListAdapter,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Executing Content Sync: ${job.name}`);

    try {
      switch (job.name) {
        case 'hot-status-sync':
          await this.syncHotMedia();
          break;
        case 'proactive-discovery':
          await this.discoverNewMedia();
          break;
        case 'discovery-refresh':
          await this.discoveryEngine.refreshDiscoveryScores();
          break;
        case 'catalog-deep-crawl':
          await this.crawlCatalogDepth();
          break;
        default:
          this.logger.warn(`Unknown sync job: ${job.name}`);
      }
    } catch (error) {
      this.logger.error(
        `Job ${job.name} failed:`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Crawls multiple pages of Anime and Manga (Popularity, Highest Rated, and Unreleased)
   * with polite pacing (1.2s between pages) to build a 2,000+ item local catalog.
   */
  private async crawlCatalogDepth(): Promise<void> {
    this.logger.log(
      `Starting deep catalog crawl (${this.DEEP_CRAWL_PAGES} pages per category)...`,
    );

    for (let page = 1; page <= this.DEEP_CRAWL_PAGES; page++) {
      const animeBatch = await this.mediaDataService.fetchAndSyncCandidates({
        type: 'ANIME',
        statusNot: 'NOT_YET_RELEASED',
        isAdult: false,
        sort: ['POPULARITY_DESC', 'ID_DESC'],
        page,
        limit: 50,
      });
      await this.sleep(2200);

      const mangaBatch = await this.mediaDataService.fetchAndSyncCandidates({
        type: 'MANGA',
        statusNot: 'NOT_YET_RELEASED',
        isAdult: false,
        sort: ['POPULARITY_DESC', 'ID_DESC'],
        page,
        limit: 50,
      });
      await this.sleep(2200);

      this.logger.log(
        `Deep Crawl Page ${page}/${this.DEEP_CRAWL_PAGES} synced (${animeBatch.length} Anime, ${mangaBatch.length} Manga)`,
      );

      if (animeBatch.length === 0 && mangaBatch.length === 0) {
        break;
      }
    }

    for (let page = 1; page <= 5; page++) {
      await this.mediaDataService.fetchAndSyncCandidates({
        type: 'ANIME',
        status: 'NOT_YET_RELEASED',
        isAdult: false,
        sort: ['POPULARITY_DESC', 'ID_DESC'],
        page,
        limit: 50,
      });
      await this.sleep(2200);
    }

    this.logger.log('Deep catalog crawl completed successfully.');
  }

  private async syncHotMedia() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let lastId = '00000000-0000-0000-0000-000000000000';
    let hasMore = true;

    while (hasMore) {
      const batch = await this.mediaRepo
        .createQueryBuilder('media')
        .select(['media.id', 'media.externalId', 'media.mediaType'])
        .where('media.id > :lastId', { lastId })
        .andWhere(
          '(media.status = :releasing OR (media.status = :upcoming AND media.startDate >= :past))',
          {
            releasing: 'RELEASING',
            upcoming: 'NOT_YET_RELEASED',
            past: thirtyDaysAgo,
          },
        )
        .orderBy('media.id', 'ASC')
        .limit(this.BATCH_SIZE)
        .getMany();

      if (batch.length === 0) {
        hasMore = false;
        break;
      }

      lastId = batch[batch.length - 1].id;

      const animeIds = batch
        .filter((i) => i.mediaType === 'ANIME')
        .map((i) => i.externalId);
      const mangaIds = batch
        .filter((i) => i.mediaType === 'MANGA')
        .map((i) => i.externalId);

      if (animeIds.length) {
        const freshAnime = await this.anilistAdapter.getMediaByIds(
          animeIds,
          'ANIME',
        );
        await this.mediaDataService.syncMediaBatch(freshAnime);
      }

      if (mangaIds.length) {
        const freshManga = await this.anilistAdapter.getMediaByIds(
          mangaIds,
          'MANGA',
        );
        await this.mediaDataService.syncMediaBatch(freshManga);
      }
    }
  }

  private async discoverNewMedia() {
    const today = new Date();
    const future = new Date();
    future.setDate(today.getDate() + 180);

    await this.mediaDataService.fetchAndSyncCandidates({
      type: 'ANIME',
      status: 'NOT_YET_RELEASED',
      startDateGreater: parseInt(
        `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}00`,
        10,
      ),
      startDateLesser: parseInt(
        `${future.getFullYear()}${String(future.getMonth() + 1).padStart(2, '0')}00`,
        10,
      ),
      limit: 50,
      sort: ['POPULARITY_DESC'],
    });

    await this.mediaDataService.fetchAndSyncCandidates({
      type: 'MANGA',
      isAdult: false,
      limit: 50,
      sort: ['TRENDING_DESC', 'POPULARITY_DESC'],
    });
  }
}
