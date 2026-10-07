// Enums
export type MediaStatus =
  | "FINISHED"
  | "RELEASING"
  | "NOT_YET_RELEASED"
  | "CANCELLED"
  | "HIATUS"
  | "UNKNOWN";
export type MediaFormat =
  | "TV"
  | "TV_SHORT"
  | "MOVIE"
  | "SPECIAL"
  | "OVA"
  | "ONA"
  | "MUSIC"
  | "MANGA"
  | "NOVEL"
  | "ONE_SHOT"
  | "UNKNOWN";
export type MediaRelationType =
  | "ADAPTATION"
  | "PREQUEL"
  | "SEQUEL"
  | "PARENT"
  | "SIDE_STORY"
  | "CHARACTER"
  | "SUMMARY"
  | "ALTERNATIVE"
  | "SPIN_OFF"
  | "SOURCE"
  | "COMPILATION"
  | "CONTAINS"
  | "SAME_UNIVERSE"
  | "OTHER";

// Generics
export interface CollectionMeta {
  total: number;
  hasMore: boolean;
}

export interface Collection<T> {
  meta: CollectionMeta;
  items: T[];
}

// Sub-Entities
export interface MediaTitle {
  english: string | null;
  romaji: string | null;
  native: string | null;
}

export interface MediaImages {
  extraLarge: string | null;
  large: string | null;
  color: string | null;
}

export interface MediaCardDto {
  id: string;
  providerId: string;
  provider: string;
  title: MediaTitle;
  coverImage: MediaImages;
  bannerImage: string | null;
  colorHex: string | null;
  status: MediaStatus;
  format: MediaFormat;
  episodes: number | null;
  chapters: number | null;
  volumes: number | null;
  season: string | null;
  seasonYear: number | null;
  averageScore: number | null;
  popularity: number | null;
}

export interface MediaAiringDto {
  nextEpisode: {
    episode: number;
    airingAt: number;
  } | null;
  upcomingEpisodes: Array<{ episode: number; airingAt: number }>;
  cadence: "WEEKLY" | "BIWEEKLY" | "DAILY" | "IRREGULAR" | "UNKNOWN";
  cadenceConfidence: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  updatedAt: string;
}

export interface MediaVoiceLanguagesDto {
  languages: Array<{ code: string; name: string }>;
  status: "AVAILABLE" | "PARTIAL" | "NONE_LISTED" | "UNKNOWN";
}

export interface MediaCharacterDto {
  id: string;
  name: string;
  characterName: string | null;
  image: string | null;
  role: "MAIN" | "SUPPORTING" | "BACKGROUND" | "UNKNOWN";
  roleNotes: string | null;
  voiceActors: Array<{
    id: string;
    name: string;
    language: string | null;
    image: string | null;
  }>;
}

export interface MediaStaffDto {
  id: string;
  name: string;
  image: string | null;
  roles: string[];
}

export interface MediaRelationDto {
  relationType: MediaRelationType;
  displayOrder: number | null;
  media: MediaCardDto;
}

// The Master DTO
export interface MediaDetailDto {
  id: string;
  providerId: string;
  provider: string;
  type: "ANIME" | "MANGA";
  slug: string;

  title: MediaTitle;
  synonyms: string[];
  description: { text: string; html: string };

  coverImage: MediaImages;
  bannerImage: string | null;
  colorHex: string | null;

  status: MediaStatus;
  format: MediaFormat;
  startDate: {
    year: number | null;
    month: number | null;
    day: number | null;
  } | null;
  endDate: {
    year: number | null;
    month: number | null;
    day: number | null;
  } | null;
  season: string | null;
  seasonYear: number | null;

  episodes: number | null;
  duration: number | null;
  chapters: number | null;
  volumes: number | null;

  genres: string[];
  tags: Array<{
    id: string;
    name: string;
    description: string | null;
    rank: number | null;
    isSpoiler: boolean;
  }>;

  source: string | null;
  countryOfOrigin: string | null;
  averageScore: number | null;
  popularity: number | null;
  isAdult: boolean;

  airing: MediaAiringDto | null;
  voiceLanguages: MediaVoiceLanguagesDto;

  trailer: { id: string; site: string; thumbnail: string | null } | null;
  studios: Array<{
    id: string;
    name: string;
    isMain: boolean;
    isAnimationStudio: boolean;
  }>;

  characters: Collection<MediaCharacterDto>;
  staff: Collection<MediaStaffDto>;
  relations: Collection<MediaRelationDto>;
  recommendations: Collection<{
    media: MediaCardDto;
    score: number | null;
    rank: number | null;
  }>;

  externalLinks: Array<{
    id: string;
    url: string;
    site: string;
    icon: string | null;
    color: string | null;
  }>;
  viewer: unknown | null; // FIX: Replaced 'any' with 'unknown'
}
