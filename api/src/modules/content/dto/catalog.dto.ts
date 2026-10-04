import { z } from 'zod';
import { MediaCardDto } from './discovery.dto';

export const CatalogSortEnum = z.enum([
  'POPULARITY_DESC',
  'SCORE_DESC',
  'START_DATE_DESC',
  'TRENDING_DESC',
]);

export const CatalogQuerySchema = z
  .object({
    type: z.enum(['ANIME', 'MANGA']).default('ANIME'),
    sort: CatalogSortEnum.default('POPULARITY_DESC'),
    status: z
      .enum([
        'FINISHED',
        'RELEASING',
        'NOT_YET_RELEASED',
        'CANCELLED',
        'HIATUS',
      ])
      .optional(),
    season: z
      .enum(['WINTER', 'SPRING', 'SUMMER', 'FALL', 'CURRENT'])
      .optional(),
    format: z.string().max(50).optional(),
    genre: z.string().max(50).optional(),
    search: z.string().trim().max(100).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(24),
    page: z.coerce.number().int().min(1).default(1), // <-- FIX: Replaces cursor
  })
  .strict();

export type CatalogQueryDto = z.infer<typeof CatalogQuerySchema>;

export interface CatalogPageResponse {
  items: MediaCardDto[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
  };
}
