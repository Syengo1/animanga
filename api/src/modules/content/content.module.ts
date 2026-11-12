// C:\Projects\animanga-platform\api\src\modules\content\content.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { MediaItem } from './entities/media-item.entity';
import { MediaTrendSnapshot } from './entities/media-trend-snapshot.entity';
import { MediaDiscoveryScore } from './entities/media-discovery-score.entity';
import { MediaEditorialOverride } from './entities/media-editorial-override.entity';
import { AniListAdapter } from './adapters/anilist/anilist.adapter';
import { ContentSafetyService } from './services/content-safety.service';
import { MediaDataService } from './services/media-data.service';
import { DiscoveryScoringService } from './services/discovery-scoring.service';
import { DiscoveryEngineService } from './services/discovery-engine.service';
import { ContentBootstrapService } from './services/content-bootstrap.service';
import { MediaController } from './controllers/media.controller';
import { DiscoveryController } from './controllers/discovery.controller';
import { ContentSyncWorker } from './workers/content-sync.worker';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MediaItem,
      MediaTrendSnapshot,
      MediaDiscoveryScore,
      MediaEditorialOverride,
    ]),
    BullModule.registerQueue({ name: 'content-sync' }),
  ],
  controllers: [MediaController, DiscoveryController],
  providers: [
    ContentSafetyService,
    AniListAdapter,
    MediaDataService,
    DiscoveryScoringService,
    DiscoveryEngineService,
    ContentBootstrapService,
    ContentSyncWorker,
  ],
  exports: [MediaDataService, DiscoveryEngineService, ContentSafetyService],
})
export class ContentModule {}
