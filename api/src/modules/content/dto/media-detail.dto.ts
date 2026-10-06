import { z } from 'zod';

// --- Domain Enums ---
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

// --- Base Value Objects ---
export const FuzzyDateSchema = z
  .object({
    year: z.number().int().nullable(),
    month: z.number().int().min(1).max(12).nullable(),
    day: z.number().int().min(1).max(31).nullable(),
  })
  .strict();

export const CollectionMetaSchema = z
  .object({
    total: z.number().int().nonnegative(),
    hasMore: z.boolean(),
  })
  .strict();

const createCollectionSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z
    .object({
      meta: CollectionMetaSchema,
      items: z.array(itemSchema),
    })
    .strict();

// --- Canonical Media Card (Used for Relations & Recommendations) ---
export const MediaCardSchema = z
  .object({
    id: z.string(),
    providerId: z.string(),
    provider: z.string(),
    title: z
      .object({
        english: z.string().nullable(),
        romaji: z.string().nullable(),
        native: z.string().nullable(),
      })
      .strict(),
    coverImage: z
      .object({
        extraLarge: z.string().nullable(),
        large: z.string().nullable(),
        color: z.string().nullable(),
      })
      .strict(),
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
  .strip(); // Strips excess provider fields but strictly enforces our domain properties

// --- Relationship Sub-DTOs ---
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

// --- The Definitive MediaDetailDto ---
export const MediaDetailSchema = z
  .object({
    id: z.string().uuid(),
    providerId: z.string(),
    provider: z.string(),
    type: z.enum(['ANIME', 'MANGA']),
    slug: z.string(),

    title: z
      .object({
        english: z.string().nullable(),
        romaji: z.string().nullable(),
        native: z.string().nullable(),
      })
      .strict(),
    synonyms: z.array(z.string()),

    description: z
      .object({
        text: z.string(),
        html: z.string(),
      })
      .strict(),

    coverImage: z
      .object({
        extraLarge: z.string().nullable(),
        large: z.string().nullable(),
        color: z.string().nullable(),
      })
      .strict(),
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

    characters: createCollectionSchema(MediaCharacterSchema),
    staff: createCollectionSchema(MediaStaffSchema),
    relations: createCollectionSchema(MediaRelationSchema),

    recommendations: createCollectionSchema(
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

    viewer: z
      .object({
        isAuthenticated: z.literal(true),
        isFollowing: z.boolean(),
        isFavorite: z.boolean(),
        listStatus: z.string().nullable(),
        progress: z.number().int().nullable(),
      })
      .nullable(),
  })
  .strip();

export type MediaDetailDto = z.infer<typeof MediaDetailSchema>;
