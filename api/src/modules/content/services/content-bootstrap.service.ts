// C:\Projects\animanga-platform\api\src\modules\content\services\content-bootstrap.service.ts
import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class ContentBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ContentBootstrapService.name);

  constructor(@InjectQueue('content-sync') private readonly syncQueue: Queue) {}

  async onApplicationBootstrap() {
    this.logger.log('Registering distributed BullMQ job schedulers...');

    // 1. Hot Status Sync (Every 15 minutes)
    await this.syncQueue.upsertJobScheduler(
      'hot-status-sync-scheduler',
      { pattern: '*/15 * * * *' },
      { name: 'hot-status-sync' },
    );

    // 2. Discovery Score Refresh (Every 1 hour)
    await this.syncQueue.upsertJobScheduler(
      'discovery-refresh-scheduler',
      { pattern: '0 * * * *' },
      { name: 'discovery-refresh' },
    );

    // 3. Proactive Upstream Discovery (Every 6 hours)
    await this.syncQueue.upsertJobScheduler(
      'proactive-discovery-scheduler',
      { pattern: '0 */6 * * *' },
      { name: 'proactive-discovery' },
    );

    // 4. Deep Catalog Crawler (Daily at 03:00 UTC + Trigger immediately on boot)
    await this.syncQueue.upsertJobScheduler(
      'catalog-deep-crawl-scheduler',
      { pattern: '0 3 * * *' },
      { name: 'catalog-deep-crawl' },
    );

    await this.syncQueue.add(
      'catalog-deep-crawl',
      {},
      {
        jobId: 'initial-catalog-deep-crawl',
        removeOnComplete: true,
        removeOnFail: true,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );

    this.logger.log(
      'Distributed schedulers and initial deep catalog crawl queued.',
    );
  }
}
