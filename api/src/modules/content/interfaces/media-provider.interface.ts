export type MediaType = 'ANIME' | 'MANGA';
export type MediaSeason = 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL' | null;
export type MediaStatus =
  | 'FINISHED'
  | 'RELEASING'
  | 'NOT_YET_RELEASED'
  | 'CANCELLED'
  | 'HIATUS'
  | 'UNKNOWN';

export interface CanonicalMedia {
  external: {
    provider: string;
    externalId: string;
  };
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
  startDate?: Date;
  endDate?: Date;
  format?: string;
  duration?: number;
  coverImageUrl?: string;
  bannerImageUrl?: string;
  colorHex?: string;
  episodes?: number;
  chapters?: number;
  volumes?: number;
  genres: string[];
  averageScore?: number;
  popularity?: number;
  isAdult?: boolean;
  sourceUpdatedAt?: Date;
}

export interface CanonicalMediaTrend {
  mediaId: string;
  provider: string;
  date: number; // Unix timestamp or AniList epoch date
  trending: number;
  popularity: number;
  inProgress: number;
  releasing: boolean;
  episode?: number;
  averageScore?: number;
}

export interface MediaCandidateOptions {
  type?: MediaType;
  status?: MediaStatus;
  statusNot?: MediaStatus;
  season?: MediaSeason;
  seasonYear?: number;
  startDateGreater?: number; // YYYYMMDD
  startDateLesser?: number; // YYYYMMDD
  sort?: string[];
  isAdult?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface MediaTrendOptions {
  dateGreater?: number; // Unix timestamp
  dateLesser?: number; // Unix timestamp
  mediaId?: number;
  page?: number;
  limit?: number;
}

export interface MediaProvider {
  readonly providerName: string;
  getMediaCandidates(options: MediaCandidateOptions): Promise<CanonicalMedia[]>;
  getMediaTrends(options: MediaTrendOptions): Promise<CanonicalMediaTrend[]>;
  getMediaByIds(ids: string[], type?: MediaType): Promise<CanonicalMedia[]>;
}
