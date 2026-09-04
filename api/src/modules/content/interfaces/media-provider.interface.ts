export type MediaType = 'ANIME' | 'MANGA';

export type MediaStatus =
  | 'FINISHED'
  | 'RELEASING'
  | 'NOT_YET_RELEASED'
  | 'CANCELLED'
  | 'HIATUS'
  | 'UNKNOWN';

export type MediaSeason = 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL' | null;

export interface ExternalMediaReference {
  provider: string;
  externalId: string;
}

/**
 * The Canonical Animanga Media Object.
 * This is the strict representation of media within our ecosystem.
 * Neither the NestJS API edge nor the Next.js frontend should ever
 * see raw provider data (e.g., from AniList or Jikan).
 */
export interface CanonicalMedia {
  external: ExternalMediaReference;

  type: MediaType;

  title: {
    romaji?: string;
    english?: string;
    native?: string;
  };

  synopsis?: string;
  status: MediaStatus;
  season: MediaSeason;
  seasonYear?: number;

  coverImageUrl?: string;
  bannerImageUrl?: string;
  colorHex?: string; // Extremely useful for dynamic UI theming

  episodes?: number;
  chapters?: number;
  volumes?: number;

  genres: string[];

  averageScore?: number;

  sourceUpdatedAt?: Date;

  /**
   * Provider-specific information that is useful for
   * normalization/debugging but is not part of the
   * canonical domain contract.
   */
  providerMetadata?: Record<string, unknown>;
}

export interface MediaSearchOptions {
  query: string;
  type?: MediaType;
  limit?: number;
  page?: number;
}

/**
 * The strictly enforced interface that all external media APIs
 * (AniList, Jikan, MAL) must adhere to before returning data.
 */
export interface MediaProvider {
  readonly providerName: string;

  search(options: MediaSearchOptions): Promise<CanonicalMedia[]>;

  getById(externalId: string, type?: MediaType): Promise<CanonicalMedia | null>;

  getTrending(type: MediaType, limit?: number): Promise<CanonicalMedia[]>;

  getCurrentlyReleasing(
    type: MediaType,
    limit?: number,
  ): Promise<CanonicalMedia[]>;

  getSeasonal(
    type: MediaType,
    season: Exclude<MediaSeason, null>,
    year: number,
    limit?: number,
  ): Promise<CanonicalMedia[]>;
}
