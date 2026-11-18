// C:\Projects\animanga-platform\api\src\modules\content\services\library.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { UserMediaEntry } from '../entities/user-media-entry.entity';
import { MediaItem } from '../entities/media-item.entity';
import { MediaDataService } from './media-data.service';
import {
  UpsertLibraryEntryDto,
  BulkSyncLibraryDto,
  LibraryEntryDto,
  LibraryStatsDto,
  UserLibraryResponseDto,
} from '../dto/library.dto';

@Injectable()
export class LibraryService {
  constructor(
    @InjectRepository(UserMediaEntry)
    private readonly entryRepo: Repository<UserMediaEntry>,
    @InjectRepository(MediaItem)
    private readonly mediaRepo: Repository<MediaItem>,
    private readonly mediaDataService: MediaDataService,
  ) {}

  private mapEntryToDto(entry: UserMediaEntry): LibraryEntryDto {
    const item = entry.mediaItem;
    const baseCard = this.mediaDataService.mapToDto(item);
    const maxUnits =
      item.mediaType === 'MANGA'
        ? (item.chapters ?? null)
        : (item.episodes ?? null);

    return {
      id: entry.id,
      mediaId: entry.mediaId,
      mediaType: item.mediaType,
      status: entry.status ?? null,
      isFavorite: Boolean(entry.isFavorite),
      progress: entry.progress ?? 0,
      maxUnits,
      score:
        entry.score !== null && entry.score !== undefined
          ? Number(entry.score)
          : null,
      notes: entry.notes ?? null,
      updatedAt: entry.updatedAt.toISOString(),
      createdAt: entry.createdAt.toISOString(),
      media: {
        ...baseCard,
        nextAiringAt: item.nextAiringAt?.toISOString() ?? null,
        nextAiringEpisode: item.nextAiringEpisode ?? null,
      },
    };
  }

  private computeStats(entries: LibraryEntryDto[]): LibraryStatsDto {
    let totalAnime = 0;
    let totalManga = 0;
    let favoritesCount = 0;
    let episodesWatched = 0;
    let chaptersRead = 0;
    let completedAnime = 0;
    let completedManga = 0;
    let scoreSum = 0;
    let scoredCount = 0;

    const genreCounter = new Map<string, number>();

    for (const entry of entries) {
      if (entry.isFavorite) favoritesCount += 1;

      if (entry.mediaType === 'ANIME') {
        if (entry.status) totalAnime += 1;
        episodesWatched += entry.progress;
        if (entry.status === 'COMPLETED') completedAnime += 1;
      } else {
        if (entry.status) totalManga += 1;
        chaptersRead += entry.progress;
        if (entry.status === 'COMPLETED') completedManga += 1;
      }

      if (entry.score && entry.score > 0) {
        scoreSum += entry.score;
        scoredCount += 1;
      }

      for (const genre of entry.media.genres || []) {
        genreCounter.set(genre, (genreCounter.get(genre) || 0) + 1);
      }
    }

    const topGenres = Array.from(genreCounter.entries())
      .map(([genre, count]) => ({ genre, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalEntries: entries.length,
      totalAnime,
      totalManga,
      favoritesCount,
      episodesWatched,
      chaptersRead,
      completedAnime,
      completedManga,
      meanScore:
        scoredCount > 0 ? Number((scoreSum / scoredCount).toFixed(1)) : null,
      topGenres,
    };
  }

  async getUserLibrary(userId: string): Promise<UserLibraryResponseDto> {
    const rawEntries = await this.entryRepo.find({
      where: { userId },
      relations: { mediaItem: true },
      order: { updatedAt: 'DESC' },
    });

    const validEntries = rawEntries
      .filter((e) => Boolean(e.mediaItem))
      .map((e) => this.mapEntryToDto(e));

    return {
      entries: validEntries,
      stats: this.computeStats(validEntries),
    };
  }

  async getEntryForMedia(
    userId: string,
    mediaId: string,
  ): Promise<LibraryEntryDto | null> {
    const entry = await this.entryRepo.findOne({
      where: { userId, mediaId },
      relations: { mediaItem: true },
    });

    if (!entry || !entry.mediaItem) return null;
    return this.mapEntryToDto(entry);
  }

  async upsertEntry(
    userId: string,
    mediaId: string,
    input: UpsertLibraryEntryDto,
  ): Promise<LibraryEntryDto | null> {
    const mediaItem = await this.mediaRepo.findOne({ where: { id: mediaId } });
    if (!mediaItem) {
      throw new NotFoundException(`Media item ${mediaId} not found`);
    }

    let entry = await this.entryRepo.findOne({
      where: { userId, mediaId },
    });

    if (!entry) {
      entry = this.entryRepo.create({
        userId,
        mediaId,
        status: input.status ?? null,
        isFavorite: input.isFavorite ?? false,
        progress: input.progress ?? 0,
        score:
          input.score !== undefined && input.score !== null
            ? input.score.toFixed(1)
            : null,
        notes: input.notes ?? null,
      });
    } else {
      if (input.status !== undefined) entry.status = input.status;
      if (input.isFavorite !== undefined) entry.isFavorite = input.isFavorite;
      if (input.progress !== undefined) entry.progress = input.progress;
      if (input.score !== undefined) {
        entry.score = input.score !== null ? input.score.toFixed(1) : null;
      }
      if (input.notes !== undefined) entry.notes = input.notes;
    }

    const maxUnits =
      mediaItem.mediaType === 'MANGA' ? mediaItem.chapters : mediaItem.episodes;

    if (maxUnits && maxUnits > 0) {
      if (entry.status === 'COMPLETED' && input.progress === undefined) {
        entry.progress = maxUnits;
      } else if (entry.progress > maxUnits) {
        entry.progress = maxUnits;
      }
    }

    // If user cleared status and unfavorited with zero progress, remove the row cleanly
    if (
      !entry.status &&
      !entry.isFavorite &&
      entry.progress === 0 &&
      !entry.score
    ) {
      if (entry.id) {
        await this.entryRepo.delete({ id: entry.id });
      }
      return null;
    }

    const saved = await this.entryRepo.save(entry);
    saved.mediaItem = mediaItem;
    return this.mapEntryToDto(saved);
  }

  async removeEntry(
    userId: string,
    mediaId: string,
  ): Promise<{ removed: boolean }> {
    const res = await this.entryRepo.delete({ userId, mediaId });
    return { removed: Boolean(res.affected && res.affected > 0) };
  }

  async syncLocalEntries(
    userId: string,
    input: BulkSyncLibraryDto,
  ): Promise<{ syncedCount: number }> {
    if (!input.entries || input.entries.length === 0) {
      return { syncedCount: 0 };
    }

    const mediaIds = Array.from(new Set(input.entries.map((e) => e.mediaId)));
    const existingMedia = await this.mediaRepo.find({
      where: { id: In(mediaIds) },
      select: { id: true },
    });
    const validMediaSet = new Set(existingMedia.map((m) => m.id));

    const existingEntries = await this.entryRepo.find({
      where: { userId, mediaId: In(mediaIds) },
    });
    const existingMap = new Map(existingEntries.map((e) => [e.mediaId, e]));

    let syncedCount = 0;

    for (const item of input.entries) {
      if (!validMediaSet.has(item.mediaId)) continue;

      const current = existingMap.get(item.mediaId);
      if (!current) {
        const created = this.entryRepo.create({
          userId,
          mediaId: item.mediaId,
          status: item.status ?? null,
          isFavorite: item.isFavorite ?? false,
          progress: item.progress ?? 0,
          score:
            item.score !== undefined && item.score !== null
              ? item.score.toFixed(1)
              : null,
        });
        await this.entryRepo.save(created);
        syncedCount += 1;
      } else {
        let changed = false;
        if (!current.status && item.status) {
          current.status = item.status;
          changed = true;
        }
        if (!current.isFavorite && item.isFavorite) {
          current.isFavorite = true;
          changed = true;
        }
        if (item.progress && item.progress > current.progress) {
          current.progress = item.progress;
          changed = true;
        }
        if (changed) {
          await this.entryRepo.save(current);
          syncedCount += 1;
        }
      }
    }

    return { syncedCount };
  }
}
