// C:\Projects\animanga-platform\api\src\modules\content\dto\catalog.dto.ts
import { z } from 'zod';
import { MediaCardDto } from './discovery.dto';

export const CatalogSortEnum = z.enum([
  'POPULARITY_DESC',
  'TRENDING_DESC',
  'SCORE_DESC',
  'START_DATE_DESC',
  'START_DATE_ASC',
  'TITLE_ASC',
  'TITLE_DESC',
  'EPISODES_DESC',
  'EPISODES_ASC',
]);

export const ReleaseStateEnum = z.enum(['RELEASED', 'UNRELEASED', 'ALL']);

export const CatalogQuerySchema = z
  .object({
    type: z.enum(['ANIME', 'MANGA']).default('ANIME'),
    sort: CatalogSortEnum.default('POPULARITY_DESC'),
    releaseState: ReleaseStateEnum.default('RELEASED'),
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
    year: z.coerce.number().int().min(1940).max(2035).optional(),
    format: z.string().max(50).optional(),
    genre: z.string().max(250).optional(),
    minEpisodes: z.coerce.number().int().min(1).optional(),
    maxEpisodes: z.coerce.number().int().min(1).optional(),
    search: z.string().trim().max(100).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(24),
    page: z.coerce.number().int().min(1).default(1),
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
