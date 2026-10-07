export interface AniListAiringEpisode {
  episode: number;
  airingAt: number;
  timeUntilAiring: number; // Queried but ignored by the mapper for caching stability
}

export interface AniListFuzzyDate {
  year?: number;
  month?: number;
  day?: number;
}

export interface AniListTrailer {
  id: string;
  site: string;
  thumbnail?: string;
}

export interface AniListStudioEdge {
  isMain: boolean;
  node: {
    id: number;
    name: string;
    isAnimationStudio: boolean;
  };
}

export interface AniListVoiceActor {
  id: number;
  name: { full: string };
  languageV2: string;
  image?: { large?: string };
}

export interface AniListCharacterEdge {
  role: string;
  node: {
    id: number;
    name: { full: string };
    image?: { large?: string };
  };
  voiceActors?: AniListVoiceActor[];
}

export interface AniListStaffEdge {
  role: string;
  node: {
    id: number;
    name: { full: string };
    image?: { large?: string };
  };
}

export interface AniListRelationEdge {
  relationType: string;
  node: {
    id: number;
    type: string;
    title: {
      english?: string;
      romaji?: string;
      native?: string;
    };
    coverImage?: {
      extraLarge?: string;
      large?: string;
      color?: string;
    };
    bannerImage?: string;
    format?: string;
    status?: string;
    episodes?: number;
    chapters?: number;
    volumes?: number;
    season?: string;
    seasonYear?: number;
    averageScore?: number;
    popularity?: number;
  };
}

// NEW: Tag interface for genres/themes
export interface AniListTag {
  id: number;
  name: string;
  description?: string;
  rank?: number;
  isMediaSpoiler?: boolean;
}

// NEW: External Link interface for "Where to Watch" (Streaming, Official Sites)
export interface AniListExternalLink {
  id: number;
  url: string;
  site: string;
  icon?: string;
  color?: string;
}

// NEW: Recommendation Edge to populate the "You May Also Like" cards
export interface AniListRecommendationEdge {
  node: {
    rating?: number;
    mediaRecommendation?: {
      id: number;
      type: string;
      title: {
        english?: string;
        romaji?: string;
        native?: string;
      };
      coverImage?: {
        extraLarge?: string;
        large?: string;
        color?: string;
      };
      bannerImage?: string;
      format?: string;
      status?: string;
      episodes?: number;
      chapters?: number;
      volumes?: number;
      season?: string;
      seasonYear?: number;
      averageScore?: number;
      popularity?: number;
    };
  };
}

export interface AniListMedia {
  id: number;
  type: string;
  title: {
    romaji?: string;
    english?: string;
    native?: string;
  };
  description?: string;
  synonyms?: string[];
  coverImage?: {
    extraLarge?: string;
    large?: string;
    color?: string;
  };
  bannerImage?: string;
  status?: string;
  format?: string;
  startDate?: AniListFuzzyDate;
  endDate?: AniListFuzzyDate;
  season?: string;
  seasonYear?: number;
  episodes?: number;
  duration?: number;
  chapters?: number;
  volumes?: number;
  genres?: string[];
  source?: string;
  countryOfOrigin?: string;
  averageScore?: number;
  popularity?: number;
  isAdult?: boolean;
  trailer?: AniListTrailer;

  // NEW: Injected array properties
  tags?: AniListTag[];
  externalLinks?: AniListExternalLink[];

  studios?: { edges?: AniListStudioEdge[] };
  characters?: {
    pageInfo?: { total: number; hasNextPage: boolean };
    edges?: AniListCharacterEdge[];
  };
  staff?: {
    pageInfo?: { total: number; hasNextPage: boolean };
    edges?: AniListStaffEdge[];
  };

  nextAiringEpisode?: AniListAiringEpisode;
  airingSchedule?: {
    nodes?: AniListAiringEpisode[];
  };
  relations?: { edges?: AniListRelationEdge[] };

  // NEW: Recommendation connection
  recommendations?: {
    pageInfo?: { total: number; hasNextPage: boolean };
    edges?: AniListRecommendationEdge[];
  };
}
