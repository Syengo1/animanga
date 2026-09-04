import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import {
  MediaProvider,
  CanonicalMedia,
  MediaSearchOptions,
  MediaType,
  MediaSeason,
  MediaStatus,
} from '../interfaces/media-provider.interface';

// Strict Zod Schema for the AniList Node
const AniListMediaSchema = z.object({
  id: z.number(),
  type: z.enum(['ANIME', 'MANGA']).nullable().optional(),
  title: z
    .object({
      romaji: z.string().nullable().optional(),
      english: z.string().nullable().optional(),
      native: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  description: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  season: z.string().nullable().optional(),
  seasonYear: z.number().nullable().optional(),
  coverImage: z
    .object({
      extraLarge: z.string().nullable().optional(),
      color: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  bannerImage: z.string().nullable().optional(),
  episodes: z.number().nullable().optional(),
  chapters: z.number().nullable().optional(),
  volumes: z.number().nullable().optional(),
  genres: z.array(z.string()).nullable().optional(),
  averageScore: z.number().nullable().optional(),
  updatedAt: z.number().nullable().optional(),
});

interface AniListGraphQLResponse<T> {
  data: T;
  errors?: Array<{ message: string }>;
}

@Injectable()
export class AniListAdapter implements MediaProvider {
  readonly providerName = 'ANILIST';
  private readonly logger = new Logger(AniListAdapter.name);
  private readonly apiUrl = 'https://graphql.anilist.co';

  private async fetchGraphQL<T>(
    query: string,
    variables: Record<string, unknown> = {},
  ): Promise<T> {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ query, variables }),
      });

      if (!response.ok) {
        throw new Error(`AniList API HTTP Error: ${response.statusText}`);
      }

      const json = (await response.json()) as AniListGraphQLResponse<T>;

      if (json.errors && json.errors.length > 0) {
        throw new Error(`AniList GraphQL Error: ${json.errors[0].message}`);
      }

      return json.data;
    } catch (error) {
      this.logger.error(
        `Failed to fetch from AniList: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  // Strict Mappers for Enum Safety
  private mapSeason(value: string | null | undefined): MediaSeason {
    switch (value) {
      case 'WINTER':
        return 'WINTER';
      case 'SPRING':
        return 'SPRING';
      case 'SUMMER':
        return 'SUMMER';
      case 'FALL':
        return 'FALL';
      default:
        return null;
    }
  }

  private mapStatus(value: string | null | undefined): MediaStatus {
    switch (value) {
      case 'FINISHED':
        return 'FINISHED';
      case 'RELEASING':
        return 'RELEASING';
      case 'NOT_YET_RELEASED':
        return 'NOT_YET_RELEASED';
      case 'CANCELLED':
        return 'CANCELLED';
      case 'HIATUS':
        return 'HIATUS';
      default:
        return 'UNKNOWN';
    }
  }

  private mapMediaType(value: string | null | undefined): MediaType {
    if (value === 'ANIME' || value === 'MANGA') {
      return value;
    }
    this.logger.warn(
      `Received unknown or null media type from AniList, defaulting to ANIME`,
    );
    return 'ANIME';
  }

  // The Canonical Mapper
  private mapToCanonical(rawMedia: unknown): CanonicalMedia {
    const parseResult = AniListMediaSchema.safeParse(rawMedia);

    if (!parseResult.success) {
      this.logger.error(
        `AniList validation failed: ${parseResult.error.message}`,
      );
      throw new Error('Malformed media object received from provider');
    }

    const media = parseResult.data;

    return {
      external: {
        provider: this.providerName,
        externalId: media.id.toString(),
      },
      type: this.mapMediaType(media.type),
      title: {
        romaji: media.title?.romaji || undefined,
        english: media.title?.english || undefined,
        native: media.title?.native || undefined,
      },
      synopsis: media.description || undefined,
      status: this.mapStatus(media.status),
      season: this.mapSeason(media.season),
      seasonYear: media.seasonYear || undefined,
      coverImageUrl: media.coverImage?.extraLarge || undefined,
      bannerImageUrl: media.bannerImage || undefined,
      colorHex: media.coverImage?.color || undefined,
      episodes: media.episodes || undefined,
      chapters: media.chapters || undefined,
      volumes: media.volumes || undefined,
      genres: media.genres || [],
      averageScore: media.averageScore || undefined,
      sourceUpdatedAt: media.updatedAt
        ? new Date(media.updatedAt * 1000)
        : undefined,
    };
  }

  // Implementations
  async getTrending(type: MediaType, limit = 10): Promise<CanonicalMedia[]> {
    const query = `
      query ($type: MediaType, $perPage: Int) {
        Page(page: 1, perPage: $perPage) {
          media(type: $type, sort: TRENDING_DESC) {
            id
            type
            title { romaji english native }
            description
            status
            season
            seasonYear
            coverImage { extraLarge color }
            bannerImage
            episodes
            chapters
            volumes
            genres
            averageScore
            updatedAt
          }
        }
      }
    `;

    const result = await this.fetchGraphQL<{ Page: { media: unknown[] } }>(
      query,
      {
        type,
        perPage: limit,
      },
    );

    return result.Page.media.map((m) => this.mapToCanonical(m));
  }

  /* eslint-disable @typescript-eslint/no-unused-vars */

  // Future Implementations Stubs
  async search(options: MediaSearchOptions): Promise<CanonicalMedia[]> {
    return Promise.resolve<CanonicalMedia[]>([]);
  }

  async getById(
    externalId: string,
    type?: MediaType,
  ): Promise<CanonicalMedia | null> {
    return Promise.resolve<CanonicalMedia | null>(null);
  }

  async getCurrentlyReleasing(
    type: MediaType,
    limit?: number,
  ): Promise<CanonicalMedia[]> {
    return Promise.resolve<CanonicalMedia[]>([]);
  }

  async getSeasonal(
    type: MediaType,
    season: Exclude<MediaSeason, null>,
    year: number,
    limit?: number,
  ): Promise<CanonicalMedia[]> {
    return Promise.resolve<CanonicalMedia[]>([]);
  }

  /* eslint-enable @typescript-eslint/no-unused-vars */
}
