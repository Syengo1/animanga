export type DiscoveryFeed =
  | 'TRENDING_THIS_WEEK'
  | 'NEW_RELEASES'
  | 'CURRENTLY_AIRING'
  | 'UPCOMING_RELEASES'
  | 'POPULAR_THIS_SEASON';

export interface MediaCardDto {
  id: string;
  providerId: string;
  provider: string;

  title: {
    english: string | null;
    romaji: string | null;
    native: string | null;
  };

  coverImage: {
    extraLarge: string | null;
    large: string | null;
    color: string | null;
  };

  bannerImage: string | null;
  colorHex: string | null;

  status: string | null;
  format: string | null;

  episodes: number | null;
  chapters: number | null;
  volumes: number | null;

  season: string | null;
  seasonYear: number | null;

  averageScore: number | null;
  popularity: number | null;

  startDate: string | null;
  endDate: string | null;
}

export interface DiscoveryShelfDto {
  key: DiscoveryFeed;
  title: string;
  subtitle?: string;
  items: MediaCardDto[];
  generatedAt: string;
}

export interface HomeDiscoveryResponseDto {
  trendingThisWeek: DiscoveryShelfDto;
  newReleases: DiscoveryShelfDto;
  currentlyAiring: DiscoveryShelfDto;
  upcomingReleases: DiscoveryShelfDto;
  popularThisSeason: DiscoveryShelfDto;
}
