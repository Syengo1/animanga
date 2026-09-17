import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { DiscoveryEngineService } from '../services/discovery-engine.service';

@Processor('discovery-sync')
export class DiscoveryProcessor extends WorkerHost {
  private readonly logger = new Logger(DiscoveryProcessor.name);

  constructor(private readonly discoveryEngine: DiscoveryEngineService) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === 'refresh-all-feeds') {
      this.logger.log(
        `Starting background sync for discovery feeds... (Job ${job.id})`,
      );

      // The engine will perform the fetch, sync the canonical DB, calculate scores,
      // and write the results to media_discovery_scores.
      await this.discoveryEngine.refreshDiscoveryScores();

      this.logger.log(`Successfully completed discovery sync. (Job ${job.id})`);
    }
  }
}
