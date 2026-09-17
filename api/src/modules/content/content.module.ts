import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MediaItem } from './entities/media-item.entity';
import { MediaTrendSnapshot } from './entities/media-trend-snapshot.entity';
import { MediaDiscoveryScore } from './entities/media-discovery-score.entity';
import { MediaEditorialOverride } from './entities/media-editorial-override.entity';

import { AniListAdapter } from './adapters/anilist.adapter';
import { MediaDataService } from './services/media-data.service';
import { DiscoveryScoringService } from './services/discovery-scoring.service';
import { DiscoveryEngineService } from './services/discovery-engine.service';

import { MediaController } from './controllers/media.controller';
import { DiscoveryController } from './controllers/discovery.controller';

// 1. Import the new processor
import { DiscoveryProcessor } from './processors/discovery.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MediaItem,
      MediaTrendSnapshot,
      MediaDiscoveryScore,
      MediaEditorialOverride,
    ]),
  ],

  controllers: [MediaController, DiscoveryController],

  providers: [
    AniListAdapter,
    MediaDataService,
    DiscoveryScoringService,
    DiscoveryEngineService,
    DiscoveryProcessor, // 2. Add it to providers
  ],

  exports: [MediaDataService, DiscoveryEngineService],
})
export class ContentModule {}
