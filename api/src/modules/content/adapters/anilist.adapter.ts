import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import {
  MediaProvider,
  CanonicalMedia,
  CanonicalMediaTrend,
  MediaCandidateOptions,
  MediaTrendOptions,
  MediaType,
  MediaSeason,
  MediaStatus,
} from '../interfaces/media-provider.interface';

// 1. Relaxed Zod Schemas for Resilient Validation
const AniListFuzzyDateSchema = z.object({
  year: z.number().nullable().optional(),
  month: z.number().nullable().optional(),
  day: z.number().nullable().optional(),
});

const AniListMediaSchema = z
  .object({
    id: z.number(),
    type: z.enum(['ANIME', 'MANGA']).nullable().optional(),
    format: z.string().nullable().optional(),
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
    startDate: AniListFuzzyDateSchema.nullable().optional(),
    endDate: AniListFuzzyDateSchema.nullable().optional(),
    duration: z.number().nullable().optional(),
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
    genres: z.array(z.string().nullable()).nullable().optional(),
    averageScore: z.number().nullable().optional(),
    popularity: z.number().nullable().optional(),
    isAdult: z.boolean().nullable().optional(),
    updatedAt: z.number().nullable().optional(),
  })
  .passthrough(); // Allows unexpected extra fields without failing

const AniListTrendSchema = z
  .object({
    mediaId: z.number(),
    date: z.number(),
    trending: z.number(),
    popularity: z.number().nullable().optional(),
    inProgress: z.number().nullable().optional(),
    releasing: z.boolean().nullable().optional(),
    episode: z.number().nullable().optional(),
    media: z
      .object({ averageScore: z.number().nullable().optional() })
      .nullable()
      .optional(),
  })
  .passthrough();

interface AniListGraphQLResponse<T> {
  data: T;
  errors?: Array<{ message: string }>;
}

@Injectable()
export class AniListAdapter implements MediaProvider {
  readonly providerName = 'ANILIST';
  private readonly logger = new Logger(AniListAdapter.name);
  private readonly apiUrl = 'https://graphql.anilist.co';

  // Includes automatic HTTP 429 Exponential Backoff
  private async fetchGraphQL<T>(
    query: string,
    variables: Record<string, unknown> = {},
    retries = 2,
  ): Promise<T> {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': 'Animanga-Platform-Worker/1.0',
        },
        body: JSON.stringify({ query, variables }),
      });

      if (response.status === 429 && retries > 0) {
        const retryAfter = parseInt(
          response.headers.get('Retry-After') || '5',
          10,
        );
        this.logger.warn(
          `AniList Rate Limit hit. Waiting ${retryAfter}s before retry...`,
        );
        await new Promise((res) => setTimeout(res, retryAfter * 1000));
        return this.fetchGraphQL(query, variables, retries - 1);
      }

      if (!response.ok) {
        throw new Error(
          `AniList API HTTP Error: ${response.statusText} (${response.status})`,
        );
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

  // --- Mappers ---

  private parseFuzzyDate(
    fuzzy: z.infer<typeof AniListFuzzyDateSchema> | null | undefined,
  ): Date | undefined {
    if (!fuzzy?.year) return undefined;
    const month = fuzzy.month ? fuzzy.month - 1 : 0;
    const day = fuzzy.day || 1;
    return new Date(Date.UTC(fuzzy.year, month, day));
  }

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

  // Returns null instead of throwing, saving the rest of the batch
  private mapToCanonical(rawMedia: unknown): CanonicalMedia | null {
    const parseResult = AniListMediaSchema.safeParse(rawMedia);
    if (!parseResult.success) {
      this.logger.warn(
        `AniList validation failed for single item, skipping: ${parseResult.error.message}`,
      );
      return null;
    }

    const media = parseResult.data;
    return {
      external: {
        provider: this.providerName,
        externalId: media.id.toString(),
      },
      type: media.type === 'MANGA' ? 'MANGA' : 'ANIME',
      format: media.format || undefined,
      title: {
        romaji: media.title?.romaji || undefined,
        english: media.title?.english || undefined,
        native: media.title?.native || undefined,
      },
      synopsis: media.description || undefined,
      status: this.mapStatus(media.status),
      season: this.mapSeason(media.season),
      seasonYear: media.seasonYear || undefined,
      startDate: this.parseFuzzyDate(media.startDate),
      endDate: this.parseFuzzyDate(media.endDate),
      duration: media.duration || undefined,
      coverImageUrl: media.coverImage?.extraLarge || undefined,
      bannerImageUrl: media.bannerImage || undefined,
      colorHex: media.coverImage?.color || undefined,
      episodes: media.episodes || undefined,
      chapters: media.chapters || undefined,
      volumes: media.volumes || undefined,
      genres: (media.genres || []).filter((g): g is string => g !== null),
      averageScore: media.averageScore || undefined,
      popularity: media.popularity || undefined,
      isAdult: media.isAdult || false,
      sourceUpdatedAt: media.updatedAt
        ? new Date(media.updatedAt * 1000)
        : undefined,
    };
  }

  // --- Provider Contract Implementation ---

  async getMediaCandidates(
    options: MediaCandidateOptions,
  ): Promise<CanonicalMedia[]> {
    const query = `
      query (
        $page: Int, 
        $perPage: Int, 
        $type: MediaType, 
        $status: MediaStatus, 
        $statusNot: MediaStatus, 
        $season: MediaSeason, 
        $seasonYear: Int, 
        $startDateGreater: FuzzyDateInt, 
        $startDateLesser: FuzzyDateInt, 
        $sort: [MediaSort], 
        $isAdult: Boolean,
        $search: String
      ) {
        Page(page: $page, perPage: $perPage) {
          media(
            type: $type, 
            status: $status, 
            status_not: $statusNot, 
            season: $season, 
            seasonYear: $seasonYear, 
            startDate_greater: $startDateGreater, 
            startDate_lesser: $startDateLesser, 
            sort: $sort, 
            isAdult: $isAdult,
            search: $search
          ) {
            id type format title { romaji english native } description status
            season seasonYear duration
            startDate { year month day } endDate { year month day }
            coverImage { extraLarge color } bannerImage
            episodes chapters volumes genres averageScore popularity isAdult updatedAt
          }
        }
      }
    `;

    const variables = {
      page: options.page || 1,
      perPage: options.limit || 50,
      type: options.type || 'ANIME',
      status: options.status,
      statusNot: options.statusNot,
      season: options.season,
      seasonYear: options.seasonYear,
      startDateGreater: options.startDateGreater,
      startDateLesser: options.startDateLesser,
      sort: options.sort || ['POPULARITY_DESC'],
      isAdult: options.isAdult ?? false,
      search: options.search,
    };

    const result = await this.fetchGraphQL<{ Page: { media: unknown[] } }>(
      query,
      variables,
    );

    // Safely filter out any items that failed validation
    return result.Page.media
      .map((m) => this.mapToCanonical(m))
      .filter((m): m is CanonicalMedia => m !== null);
  }

  async getMediaTrends(
    options: MediaTrendOptions,
  ): Promise<CanonicalMediaTrend[]> {
    const query = `
      query ($page: Int, $perPage: Int, $dateGreater: Int, $dateLesser: Int, $mediaId: Int) {
        Page(page: $page, perPage: $perPage) {
          mediaTrend(
            date_greater: $dateGreater, 
            date_lesser: $dateLesser, 
            mediaId: $mediaId, 
            sort: [DATE_DESC]
          ) {
            mediaId date trending popularity inProgress releasing episode
            media { averageScore }
          }
        }
      }
    `;

    const variables = {
      page: options.page || 1,
      perPage: options.limit || 50,
      dateGreater: options.dateGreater,
      dateLesser: options.dateLesser,
      mediaId: options.mediaId,
    };

    const result = await this.fetchGraphQL<{ Page: { mediaTrend: unknown[] } }>(
      query,
      variables,
    );

    return result.Page.mediaTrend.map((raw) => {
      const parsed = AniListTrendSchema.parse(raw);
      return {
        mediaId: parsed.mediaId.toString(),
        provider: this.providerName,
        date: parsed.date,
        trending: parsed.trending,
        popularity: parsed.popularity || 0,
        inProgress: parsed.inProgress || 0,
        releasing: parsed.releasing || false,
        episode: parsed.episode || undefined,
        averageScore: parsed.media?.averageScore || undefined,
      };
    });
  }

  async getMediaByIds(
    ids: string[],
    type: MediaType = 'ANIME',
  ): Promise<CanonicalMedia[]> {
    if (!ids || ids.length === 0) return [];

    const query = `
      query ($ids: [Int], $type: MediaType) {
        Page(page: 1, perPage: 50) {
          media(id_in: $ids, type: $type) {
            id type format title { romaji english native } description status
            season seasonYear duration
            startDate { year month day } endDate { year month day }
            coverImage { extraLarge color } bannerImage
            episodes chapters volumes genres averageScore popularity isAdult updatedAt
          }
        }
      }
    `;

    const numericIds = ids
      .map((id) => parseInt(id, 10))
      .filter((id) => !isNaN(id));

    const result = await this.fetchGraphQL<{ Page: { media: unknown[] } }>(
      query,
      { ids: numericIds, type },
    );

    return result.Page.media
      .map((m) => this.mapToCanonical(m))
      .filter((m): m is CanonicalMedia => m !== null);
  }
}
