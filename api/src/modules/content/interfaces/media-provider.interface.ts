// C:\Projects\animanga-platform\api\src\modules\content\interfaces\media-provider.interface.ts
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
  nextAiringAt?: Date;
  nextAiringEpisode?: number;
}

export interface CanonicalMediaTrend {
  mediaId: string;
  provider: string;
  date: number;
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
  format?: string;
  genres?: string[];
  season?: MediaSeason;
  seasonYear?: number;
  startDateGreater?: number; // YYYYMMDD
  startDateLesser?: number; // YYYYMMDD
  episodesGreater?: number;
  episodesLesser?: number;
  chaptersGreater?: number;
  chaptersLesser?: number;
  sort?: string[];
  isAdult?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface UpstreamCatalogPageInfo {
  total: number;
  perPage: number;
  currentPage: number;
  lastPage: number;
  hasNextPage: boolean;
}

export interface UpstreamCatalogPageResult {
  items: CanonicalMedia[];
  pageInfo: UpstreamCatalogPageInfo;
}

export interface MediaTrendOptions {
  dateGreater?: number;
  dateLesser?: number;
  mediaId?: number;
  page?: number;
  limit?: number;
}

export interface MediaProvider {
  readonly providerName: string;
  getMediaCandidates(options: MediaCandidateOptions): Promise<CanonicalMedia[]>;
  getMediaCatalogPage(
    options: MediaCandidateOptions,
  ): Promise<UpstreamCatalogPageResult>;
  getMediaTrends(options: MediaTrendOptions): Promise<CanonicalMediaTrend[]>;
  getMediaByIds(ids: string[], type?: MediaType): Promise<CanonicalMedia[]>;
}
