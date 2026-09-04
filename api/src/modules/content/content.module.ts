import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MediaItem } from './entities/media-item.entity';
import { MediaController } from './controllers/media.controller';
import { MediaDataService } from './services/media-data.service';
import { AniListAdapter } from './adapters/anilist.adapter';

@Module({
  imports: [TypeOrmModule.forFeature([MediaItem])],
  controllers: [MediaController],
  providers: [MediaDataService, AniListAdapter],
  exports: [MediaDataService],
})
export class ContentModule {}
