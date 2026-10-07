import { z } from 'zod';

// --- Core Enums ---
export const MediaStatusSchema = z.enum([
  'FINISHED',
  'RELEASING',
  'NOT_YET_RELEASED',
  'CANCELLED',
  'HIATUS',
  'UNKNOWN',
]);
export const MediaFormatSchema = z.enum([
  'TV',
  'TV_SHORT',
  'MOVIE',
  'SPECIAL',
  'OVA',
  'ONA',
  'MUSIC',
  'MANGA',
  'NOVEL',
  'ONE_SHOT',
  'UNKNOWN',
]);
export const MediaRelationTypeSchema = z.enum([
  'ADAPTATION',
  'PREQUEL',
  'SEQUEL',
  'PARENT',
  'SIDE_STORY',
  'CHARACTER',
  'SUMMARY',
  'ALTERNATIVE',
  'SPIN_OFF',
  'SOURCE',
  'COMPILATION',
  'CONTAINS',
  'SAME_UNIVERSE',
  'OTHER',
]);

// --- Reusable Generic Collection ---
export const CollectionMetaSchema = z
  .object({
    total: z.number().int().nonnegative(),
    hasMore: z.boolean(),
  })
  .strict();

export const CollectionSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z
    .object({
      meta: CollectionMetaSchema,
      items: z.array(itemSchema),
    })
    .strict();

// --- Live Airing Contract ---
export const MediaAiringEpisodeSchema = z
  .object({
    episode: z.number().int().positive(),
    airingAt: z.number().int().positive(), // UTC Unix Seconds
  })
  .strict();

export const MediaAiringSchema = z
  .object({
    nextEpisode: MediaAiringEpisodeSchema.nullable(),
    upcomingEpisodes: z.array(MediaAiringEpisodeSchema),
    cadence: z.enum(['WEEKLY', 'BIWEEKLY', 'DAILY', 'IRREGULAR', 'UNKNOWN']),
    cadenceConfidence: z.enum(['HIGH', 'MEDIUM', 'LOW', 'UNKNOWN']),
    updatedAt: z.string().datetime(), // ISO 8601 Timestamp of last cache refresh
  })
  .strict();

// --- Voice & Audio Contract ---
export const MediaVoiceLanguageSchema = z
  .object({
    code: z.string().min(1),
    name: z.string().min(1),
  })
  .strict();

export const MediaVoiceLanguagesSchema = z
  .object({
    languages: z.array(MediaVoiceLanguageSchema),
    status: z.enum(['AVAILABLE', 'PARTIAL', 'NONE_LISTED', 'UNKNOWN']),
  })
  .strict();

// --- Base Sub-Schemas ---
export const FuzzyDateSchema = z
  .object({
    year: z.number().int().nullable(),
    month: z.number().int().min(1).max(12).nullable(),
    day: z.number().int().min(1).max(31).nullable(),
  })
  .strict();

export const MediaTitleSchema = z
  .object({
    english: z.string().nullable(),
    romaji: z.string().nullable(),
    native: z.string().nullable(),
  })
  .strict();

export const MediaImagesSchema = z
  .object({
    extraLarge: z.string().nullable(),
    large: z.string().nullable(),
    color: z.string().nullable(),
  })
  .strict();

export const MediaCardSchema = z
  .object({
    id: z.string(),
    providerId: z.string(),
    provider: z.string(),
    title: MediaTitleSchema,
    coverImage: MediaImagesSchema,
    bannerImage: z.string().nullable(),
    colorHex: z.string().nullable(),
    status: MediaStatusSchema,
    format: MediaFormatSchema,
    episodes: z.number().int().nullable(),
    chapters: z.number().int().nullable(),
    volumes: z.number().int().nullable(),
    season: z.string().nullable(),
    seasonYear: z.number().int().nullable(),
    averageScore: z.number().nullable(),
    popularity: z.number().nullable(),
  })
  .strip();

// --- Relationships ---
export const VoiceActorSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    language: z.string().nullable(),
    image: z.string().nullable(),
  })
  .strict();

export const MediaCharacterSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    characterName: z.string().nullable(),
    image: z.string().nullable(),
    role: z.enum(['MAIN', 'SUPPORTING', 'BACKGROUND', 'UNKNOWN']),
    roleNotes: z.string().nullable(),
    voiceActors: z.array(VoiceActorSchema),
  })
  .strict();

export const MediaStaffSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    image: z.string().nullable(),
    roles: z.array(z.string()),
  })
  .strict();

export const MediaRelationSchema = z
  .object({
    relationType: MediaRelationTypeSchema,
    displayOrder: z.number().int().nullable(),
    media: MediaCardSchema,
  })
  .strict();

// --- The Master DTO ---
export const MediaDetailSchema = z
  .object({
    id: z.string().uuid(),
    providerId: z.string(),
    provider: z.string(),
    type: z.enum(['ANIME', 'MANGA']),
    slug: z.string(),

    title: MediaTitleSchema,
    synonyms: z.array(z.string()),
    description: z.object({ text: z.string(), html: z.string() }).strict(), // Must be pre-sanitized

    coverImage: MediaImagesSchema,
    bannerImage: z.string().nullable(),
    colorHex: z.string().nullable(),

    status: MediaStatusSchema,
    format: MediaFormatSchema,
    startDate: FuzzyDateSchema.nullable(),
    endDate: FuzzyDateSchema.nullable(),
    season: z.string().nullable(),
    seasonYear: z.number().int().nullable(),

    episodes: z.number().int().nullable(),
    duration: z.number().int().nullable(),
    chapters: z.number().int().nullable(),
    volumes: z.number().int().nullable(),

    genres: z.array(z.string()),
    tags: z.array(
      z
        .object({
          id: z.string(),
          name: z.string(),
          description: z.string().nullable(),
          rank: z.number().int().nullable(),
          isSpoiler: z.boolean(),
        })
        .strict(),
    ),

    source: z.string().nullable(),
    countryOfOrigin: z.string().nullable(),
    averageScore: z.number().int().nullable(),
    popularity: z.number().int().nullable(),
    isAdult: z.boolean(),

    airing: MediaAiringSchema.nullable(),
    voiceLanguages: MediaVoiceLanguagesSchema,

    trailer: z
      .object({
        id: z.string(),
        site: z.string(),
        thumbnail: z.string().nullable(),
      })
      .nullable(),

    studios: z.array(
      z
        .object({
          id: z.string(),
          name: z.string(),
          isMain: z.boolean(),
          isAnimationStudio: z.boolean(),
        })
        .strict(),
    ),

    characters: CollectionSchema(MediaCharacterSchema),
    staff: CollectionSchema(MediaStaffSchema),
    relations: CollectionSchema(MediaRelationSchema),
    recommendations: CollectionSchema(
      z
        .object({
          media: MediaCardSchema,
          score: z.number().int().nullable(),
          rank: z.number().int().nullable(),
        })
        .strict(),
    ),

    externalLinks: z.array(
      z
        .object({
          id: z.string(),
          url: z.string().url(),
          site: z.string(),
          icon: z.string().nullable(),
          color: z.string().nullable(),
        })
        .strict(),
    ),
    viewer: z.any().nullable(), // Placeholder until ViewerMediaState is integrated
  })
  .strip();

export type MediaDetailDto = z.infer<typeof MediaDetailSchema>;
export type MediaAiringDto = z.infer<typeof MediaAiringSchema>;
export type MediaVoiceLanguagesDto = z.infer<typeof MediaVoiceLanguagesSchema>;
