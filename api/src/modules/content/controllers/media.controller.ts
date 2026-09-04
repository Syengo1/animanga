import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { MediaDataService } from '../services/media-data.service';
import {
  CanonicalMedia,
  MediaType,
} from '../interfaces/media-provider.interface';
import {
  MediaSearchQuerySchema,
  MediaSearchQueryDto,
  MediaFeedQuerySchema,
  MediaFeedQueryDto,
  MediaSeasonalQuerySchema,
  MediaSeasonalQueryDto,
  MediaResponseDto,
  MediaListResponseDto,
  SingleMediaResponseDto,
} from '../dto/media.dto';

@ApiTags('Content - Media')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaDataService: MediaDataService) {}

  private mapToDto(media: CanonicalMedia): MediaResponseDto {
    return {
      provider: media.external.provider,
      externalId: media.external.externalId,
      type: media.type,
      title: media.title,
      synopsis: media.synopsis,
      status: media.status,
      season: media.season,
      seasonYear: media.seasonYear,
      coverImageUrl: media.coverImageUrl,
      bannerImageUrl: media.bannerImageUrl,
      colorHex: media.colorHex,
      episodes: media.episodes,
      chapters: media.chapters,
      volumes: media.volumes,
      genres: media.genres,
      averageScore: media.averageScore ? Number(media.averageScore) : undefined,
    };
  }

  @Get('search')
  @ApiOperation({
    summary: 'Search for anime or manga across the unified media layer',
  })
  @ApiQuery({ name: 'q', type: 'string', required: true })
  @ApiQuery({ name: 'type', enum: ['ANIME', 'MANGA'], required: false })
  @ApiQuery({ name: 'limit', type: 'number', required: false })
  @ApiResponse({
    status: 200,
    description: 'List of matching media.',
    type: MediaListResponseDto,
  })
  async search(
    @Query(new ZodValidationPipe(MediaSearchQuerySchema))
    query: MediaSearchQueryDto,
  ): Promise<MediaListResponseDto> {
    const results = await this.mediaDataService.search({
      query: query.q,
      type: query.type,
      limit: query.limit,
    });

    return { data: results.map((m) => this.mapToDto(m)) };
  }

  @Get('trending')
  @ApiOperation({ summary: 'Get currently trending anime/manga' })
  @ApiQuery({ name: 'type', enum: ['ANIME', 'MANGA'], required: false })
  @ApiQuery({ name: 'limit', type: 'number', required: false })
  @ApiResponse({
    status: 200,
    description: 'Trending media feed.',
    type: MediaListResponseDto,
  })
  async getTrending(
    @Query(new ZodValidationPipe(MediaFeedQuerySchema))
    query: MediaFeedQueryDto,
  ): Promise<MediaListResponseDto> {
    const results = await this.mediaDataService.getTrending(
      query.type,
      query.limit,
    );
    return { data: results.map((m) => this.mapToDto(m)) };
  }

  @Get('airing')
  @ApiOperation({ summary: 'Get currently releasing anime' })
  @ApiQuery({ name: 'type', enum: ['ANIME', 'MANGA'], required: false })
  @ApiQuery({ name: 'limit', type: 'number', required: false })
  @ApiResponse({
    status: 200,
    description: 'Currently airing media feed.',
    type: MediaListResponseDto,
  })
  async getAiring(
    @Query(new ZodValidationPipe(MediaFeedQuerySchema))
    query: MediaFeedQueryDto,
  ): Promise<MediaListResponseDto> {
    const results = await this.mediaDataService.getCurrentlyReleasing(
      query.type,
      query.limit,
    );
    return { data: results.map((m) => this.mapToDto(m)) };
  }

  @Get('seasonal')
  @ApiOperation({ summary: 'Get anime/manga by specific season and year' })
  @ApiQuery({
    name: 'season',
    enum: ['WINTER', 'SPRING', 'SUMMER', 'FALL'],
    required: true,
  })
  @ApiQuery({ name: 'year', type: 'number', required: true })
  @ApiQuery({ name: 'type', enum: ['ANIME', 'MANGA'], required: false })
  @ApiQuery({ name: 'limit', type: 'number', required: false })
  @ApiResponse({
    status: 200,
    description: 'Seasonal media feed.',
    type: MediaListResponseDto,
  })
  async getSeasonal(
    @Query(new ZodValidationPipe(MediaSeasonalQuerySchema))
    query: MediaSeasonalQueryDto,
  ): Promise<MediaListResponseDto> {
    const results = await this.mediaDataService.getSeasonal(
      query.type,
      query.season,
      query.year,
      query.limit,
    );
    return { data: results.map((m) => this.mapToDto(m)) };
  }

  @Get(':provider/:externalId')
  @ApiOperation({ summary: 'Retrieve specific media by provider identity' })
  @ApiParam({ name: 'provider', example: 'ANILIST' })
  @ApiParam({ name: 'externalId', example: '154587' })
  @ApiQuery({ name: 'type', enum: ['ANIME', 'MANGA'], required: false })
  @ApiResponse({
    status: 200,
    description: 'Specific media item.',
    type: SingleMediaResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Media not found.' })
  async getById(
    @Param('provider') provider: string,
    @Param('externalId') externalId: string,
    @Query('type') type?: MediaType,
  ): Promise<SingleMediaResponseDto> {
    const result = await this.mediaDataService.getById(
      provider.toUpperCase(),
      externalId,
      type,
    );

    if (!result) {
      throw new NotFoundException(
        `Media not found for ${provider}:${externalId}`,
      );
    }

    return { data: this.mapToDto(result) };
  }
}
