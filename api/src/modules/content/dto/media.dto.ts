import { z } from 'zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// --- 1. INPUT VALIDATION SCHEMAS (ZOD) ---

export const MediaSearchQuerySchema = z.object({
  q: z.string().min(1, 'Search query cannot be empty'),
  type: z.enum(['ANIME', 'MANGA']).optional().default('ANIME'),
  limit: z.coerce.number().min(1).max(50).optional().default(20),
});
export type MediaSearchQueryDto = z.infer<typeof MediaSearchQuerySchema>;

export const MediaFeedQuerySchema = z.object({
  type: z.enum(['ANIME', 'MANGA']).optional().default('ANIME'),
  limit: z.coerce.number().min(1).max(50).optional().default(10),
});
export type MediaFeedQueryDto = z.infer<typeof MediaFeedQuerySchema>;

export const MediaSeasonalQuerySchema = z.object({
  type: z.enum(['ANIME', 'MANGA']).optional().default('ANIME'),
  season: z.enum(['WINTER', 'SPRING', 'SUMMER', 'FALL']),
  year: z.coerce.number().min(1950).max(3000),
  limit: z.coerce.number().min(1).max(50).optional().default(20),
});
export type MediaSeasonalQueryDto = z.infer<typeof MediaSeasonalQuerySchema>;

// --- 2. OUTPUT SWAGGER CONTRACTS (CLASSES) ---

export class MediaTitleDto {
  @ApiPropertyOptional()
  romaji?: string;

  @ApiPropertyOptional()
  english?: string;

  @ApiPropertyOptional()
  native?: string;
}

export class MediaResponseDto {
  @ApiProperty()
  provider!: string;

  @ApiProperty()
  externalId!: string;

  @ApiProperty({ enum: ['ANIME', 'MANGA'] })
  type!: string;

  @ApiProperty({ type: MediaTitleDto })
  title!: MediaTitleDto;

  @ApiPropertyOptional()
  synopsis?: string;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional({ nullable: true })
  season?: string | null;

  @ApiPropertyOptional()
  seasonYear?: number;

  @ApiPropertyOptional()
  coverImageUrl?: string;

  @ApiPropertyOptional()
  bannerImageUrl?: string;

  @ApiPropertyOptional()
  colorHex?: string;

  @ApiPropertyOptional()
  episodes?: number;

  @ApiPropertyOptional()
  chapters?: number;

  @ApiPropertyOptional()
  volumes?: number;

  @ApiProperty({ type: [String] })
  genres!: string[];

  @ApiPropertyOptional()
  averageScore?: number;
}

export class MediaListResponseDto {
  @ApiProperty({ type: [MediaResponseDto] })
  data!: MediaResponseDto[];
}

export class SingleMediaResponseDto {
  @ApiProperty({ type: MediaResponseDto })
  data!: MediaResponseDto;
}
