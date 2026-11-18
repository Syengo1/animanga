// C:\Projects\animanga-platform\api\src\modules\content\dto\library.dto.ts
import { z } from 'zod';
import { MediaCardDto } from './discovery.dto';

export const UserMediaStatusEnum = z.enum([
  'CURRENT',
  'PLANNING',
  'COMPLETED',
  'PAUSED',
  'DROPPED',
]);

export type UserMediaStatusType = z.infer<typeof UserMediaStatusEnum>;

export const UpsertLibraryEntrySchema = z
  .object({
    status: UserMediaStatusEnum.nullable().optional(),
    isFavorite: z.boolean().optional(),
    progress: z.coerce.number().int().min(0).max(50000).optional(),
    score: z.coerce.number().min(0).max(10).nullable().optional(),
    notes: z.string().trim().max(1000).nullable().optional(),
  })
  .strict();

export type UpsertLibraryEntryDto = z.infer<typeof UpsertLibraryEntrySchema>;

export const BulkSyncLibrarySchema = z
  .object({
    entries: z
      .array(
        z
          .object({
            mediaId: z.string().uuid(),
            status: UserMediaStatusEnum.nullable().optional(),
            isFavorite: z.boolean().optional(),
            progress: z.coerce.number().int().min(0).max(50000).optional(),
            score: z.coerce.number().min(0).max(10).nullable().optional(),
          })
          .strict(),
      )
      .max(200),
  })
  .strict();

export type BulkSyncLibraryDto = z.infer<typeof BulkSyncLibrarySchema>;

export interface LibraryEntryDto {
  id: string;
  mediaId: string;
  mediaType: 'ANIME' | 'MANGA';
  status: UserMediaStatusType | null;
  isFavorite: boolean;
  progress: number;
  maxUnits: number | null;
  score: number | null;
  notes: string | null;
  updatedAt: string;
  createdAt: string;
  media: MediaCardDto & {
    nextAiringAt: string | null;
    nextAiringEpisode: number | null;
  };
}

export interface LibraryStatsDto {
  totalEntries: number;
  totalAnime: number;
  totalManga: number;
  favoritesCount: number;
  episodesWatched: number;
  chaptersRead: number;
  completedAnime: number;
  completedManga: number;
  meanScore: number | null;
  topGenres: Array<{ genre: string; count: number }>;
}

export interface UserLibraryResponseDto {
  entries: LibraryEntryDto[];
  stats: LibraryStatsDto;
}
