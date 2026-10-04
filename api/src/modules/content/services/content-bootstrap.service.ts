import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class ContentBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ContentBootstrapService.name);

  constructor(@InjectQueue('content-sync') private readonly syncQueue: Queue) {}

  async onApplicationBootstrap() {
    this.logger.log('Registering distributed BullMQ job schedulers...');

    // 1. Hot Status Sync (Every 15 minutes) - Catches episode drops & transitions
    await this.syncQueue.upsertJobScheduler(
      'hot-status-sync-scheduler',
      { pattern: '*/15 * * * *' },
      { name: 'hot-status-sync' },
    );

    // 2. Discovery Score Refresh (Every 1 hour) - Rebuilds homepage carousels
    await this.syncQueue.upsertJobScheduler(
      'discovery-refresh-scheduler',
      { pattern: '0 * * * *' },
      { name: 'discovery-refresh' },
    );

    // 3. Proactive Upstream Discovery (Every 6 hours) - Imports brand new unreleased titles
    await this.syncQueue.upsertJobScheduler(
      'proactive-discovery-scheduler',
      { pattern: '0 */6 * * *' },
      { name: 'proactive-discovery' },
    );

    this.logger.log('Distributed schedulers registered successfully.');
  }
}
