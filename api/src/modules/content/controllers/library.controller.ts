// C:\Projects\animanga-platform\api\src\modules\content\controllers\library.controller.ts
import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { UuidSchema } from '../../../common/validation/identifiers.schema';
import { AuthenticatedRequest } from '../../../common/interfaces/request.interface';
import { LibraryService } from '../services/library.service';
import {
  UpsertLibraryEntrySchema,
  UpsertLibraryEntryDto,
  BulkSyncLibrarySchema,
  BulkSyncLibraryDto,
} from '../dto/library.dto';

@ApiTags('Content - User Library & Favorites')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('library')
export class LibraryController {
  constructor(private readonly libraryService: LibraryService) {}

  @Get()
  @ApiOperation({
    summary:
      "Retrieve the authenticated user's Anime/Manga library, favorites, and affinity stats",
  })
  getUserLibrary(@Req() req: AuthenticatedRequest) {
    return this.libraryService.getUserLibrary(req.user.id);
  }

  @Get(':mediaId')
  @ApiOperation({
    summary:
      "Retrieve the authenticated user's library entry for a single media item",
  })
  getEntryForMedia(
    @Req() req: AuthenticatedRequest,
    @Param('mediaId', new ZodValidationPipe(UuidSchema)) mediaId: string,
  ) {
    return this.libraryService.getEntryForMedia(req.user.id, mediaId);
  }

  @Put(':mediaId')
  @ApiOperation({
    summary:
      'Add or update a media item in watchlist, reading list, or favorites',
  })
  upsertEntry(
    @Req() req: AuthenticatedRequest,
    @Param('mediaId', new ZodValidationPipe(UuidSchema)) mediaId: string,
    @Body(new ZodValidationPipe(UpsertLibraryEntrySchema))
    body: UpsertLibraryEntryDto,
  ) {
    return this.libraryService.upsertEntry(req.user.id, mediaId, body);
  }

  @Delete(':mediaId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a media item from the user library' })
  removeEntry(
    @Req() req: AuthenticatedRequest,
    @Param('mediaId', new ZodValidationPipe(UuidSchema)) mediaId: string,
  ) {
    return this.libraryService.removeEntry(req.user.id, mediaId);
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Bulk-sync local guest bookmarks into the authenticated user account',
  })
  syncLocalEntries(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(BulkSyncLibrarySchema))
    body: BulkSyncLibraryDto,
  ) {
    return this.libraryService.syncLocalEntries(req.user.id, body);
  }
}
