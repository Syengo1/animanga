// C:\Projects\animanga-platform\api\src\modules\content\controllers\media.controller.ts
import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MediaDataService } from '../services/media-data.service';
import { MediaType } from '../interfaces/media-provider.interface';
import { CatalogQuerySchema, CatalogQueryDto } from '../dto/catalog.dto';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';

@ApiTags('Content - Media')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaDataService: MediaDataService) {}

  @Get('catalog')
  @ApiOperation({ summary: 'Paginated media catalog' })
  async getCatalog(
    @Query(new ZodValidationPipe(CatalogQuerySchema)) query: CatalogQueryDto,
  ) {
    return this.mediaDataService.getCatalogPage(query);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search media candidates' })
  async search(
    @Query('query') query?: string,
    @Query('type') type?: MediaType,
    @Query('sort') sort?: string,
    @Query('limit') limit = '15',
  ) {
    const parsedLimit = Math.min(
      Math.max(parseInt(String(limit), 10) || 15, 1),
      50,
    );
    const results = await this.mediaDataService.fetchAndSyncCandidates({
      search: query,
      type,
      sort: sort ? [sort] : undefined,
      limit: parsedLimit,
    });
    return results.map((r) => this.mediaDataService.mapToDto(r));
  }

  @Get(':id/details')
  @ApiOperation({
    summary: 'Retrieve deep media details by internal UUID or Provider ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Comprehensive media details including cast and relations.',
  })
  @ApiResponse({ status: 404, description: 'Media not found.' })
  async getMediaDetailsDeep(@Param('id') id: string) {
    const details = await this.mediaDataService.getMediaDetailsDeep(id);
    if (!details) {
      throw new NotFoundException(
        `Media record ${id} not found in the platform`,
      );
    }
    return details;
  }

  @Get(':provider/:externalId')
  @ApiOperation({ summary: 'Lookup media by upstream provider ID' })
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
    return this.mediaDataService.mapToDto(media);
  }
}
