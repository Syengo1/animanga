import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { MediaDataService } from '../services/media-data.service';
import { MediaType } from '../interfaces/media-provider.interface';
import { MediaItem } from '../entities/media-item.entity';
import { CatalogQuerySchema, CatalogQueryDto } from '../dto/catalog.dto';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaDataService: MediaDataService) {}

  // Strictly align with the Discovery DTO contract to fix missing UI images/titles
  private mapToDto(item: MediaItem) {
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

  // NEW: The Authoritative Keyset Pagination Endpoint
  @Get('catalog')
  async getCatalog(
    @Query(new ZodValidationPipe(CatalogQuerySchema)) query: CatalogQueryDto,
  ) {
    // FIX: Return the raw data directly.
    // The TransformInterceptor will automatically wrap it in { success: true, data: ... }
    return this.mediaDataService.getCatalogPage(query);
  }

  @Get('search')
  async search(
    @Query('query') query?: string,
    @Query('type') type?: MediaType,
    @Query('sort') sort?: string,
    @Query('limit') limit = 15,
  ) {
    const results = await this.mediaDataService.fetchAndSyncCandidates({
      search: query,
      type,
      sort: sort ? [sort] : undefined, // <--- Fixed: Passing sort to TypeORM/AniList
      limit,
    });
    return { success: true, data: results.map((r) => this.mapToDto(r)) };
  }

  @Get(':provider/:externalId')
  async getById(
    @Param('provider') provider: string,
    @Param('externalId') externalId: string,
    @Query('type') type?: MediaType,
  ) {
    const media = await this.mediaDataService.getMediaById(
      provider,
      externalId,
      type,
    );
    if (!media) {
      throw new NotFoundException(`Media ${externalId} not found`);
    }
    return { success: true, data: this.mapToDto(media) };
  }
}
