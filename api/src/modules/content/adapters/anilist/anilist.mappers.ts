// C:\Projects\animanga-platform\api\src\modules\content\adapters\anilist\anilist.mappers.ts
import { AniListMedia } from './anilist.types';

const LANGUAGE_CODE_MAP: Record<string, string> = {
  japanese: 'ja',
  english: 'en',
  korean: 'ko',
  chinese: 'zh',
  spanish: 'es',
  french: 'fr',
  german: 'de',
  italian: 'it',
  portuguese: 'pt',
  hebrew: 'he',
  hungarian: 'hu',
  arabic: 'ar',
  tagalog: 'tl',
  thai: 'th',
};

export function normalizeImageUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

const mapStatus = (status?: string | null) => {
  const validStatuses = [
    'FINISHED',
    'RELEASING',
    'NOT_YET_RELEASED',
    'CANCELLED',
    'HIATUS',
  ] as const;
  return validStatuses.includes(status as (typeof validStatuses)[number])
    ? (status as (typeof validStatuses)[number])
    : 'UNKNOWN';
};

const mapFormat = (format?: string | null) => {
  const validFormats = [
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
  ] as const;
  return validFormats.includes(format as (typeof validFormats)[number])
    ? (format as (typeof validFormats)[number])
    : 'UNKNOWN';
};

const mapRelationType = (type?: string | null) => {
  const validRelations = [
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
  ] as const;
  return validRelations.includes(type as (typeof validRelations)[number])
    ? (type as (typeof validRelations)[number])
    : 'OTHER';
};

const mapRole = (role?: string | null) => {
  const validRoles = ['MAIN', 'SUPPORTING', 'BACKGROUND'] as const;
  return validRoles.includes(role as (typeof validRoles)[number])
    ? (role as (typeof validRoles)[number])
    : 'UNKNOWN';
};

export const mapStudios = (studios: AniListMedia['studios']) => {
  if (!studios?.edges) return [];
  return studios.edges
    .filter((edge) => edge?.node)
    .map((edge) => ({
      id: String(edge.node.id),
      name: edge.node.name,
      isMain: Boolean(edge.isMain),
      isAnimationStudio: Boolean(edge.node.isAnimationStudio),
    }));
};

export const mapCharacters = (characters: AniListMedia['characters']) => {
  if (!characters?.edges) return [];
  return characters.edges
    .filter((edge) => edge?.node)
    .map((edge) => ({
      id: String(edge.node.id),
      name: edge.node.name?.full || 'Unknown',
      characterName: null,
      image: normalizeImageUrl(edge.node.image?.large),
      role: mapRole(edge.role),
      roleNotes: null,
      voiceActors: (edge.voiceActors || []).map((va) => ({
        id: String(va.id),
        name: va.name?.full || 'Unknown',
        language: va.languageV2 || 'Unknown',
        image: normalizeImageUrl(va.image?.large),
      })),
    }));
};

export const mapStaff = (staff: AniListMedia['staff']) => {
  if (!staff?.edges) return [];
  return staff.edges
    .filter((edge) => edge?.node)
    .map((edge) => ({
      id: String(edge.node.id),
      name: edge.node.name?.full || 'Unknown',
      image: normalizeImageUrl(edge.node.image?.large),
      roles: edge.role ? [edge.role] : [],
    }));
};

export const mapRelations = (relations: AniListMedia['relations']) => {
  if (!relations?.edges) return [];
  return relations.edges
    .filter((edge) => edge?.node)
    .map((edge) => ({
      relationType: mapRelationType(edge.relationType),
      displayOrder: null,
      media: {
        id: String(edge.node.id),
        providerId: String(edge.node.id),
        provider: 'ANILIST',
        title: {
          english: edge.node.title?.english || null,
          romaji: edge.node.title?.romaji || null,
          native: edge.node.title?.native || null,
        },
        coverImage: {
          extraLarge: normalizeImageUrl(
            edge.node.coverImage?.extraLarge || edge.node.coverImage?.large,
          ),
          large: normalizeImageUrl(edge.node.coverImage?.large),
          color: edge.node.coverImage?.color || null,
        },
        bannerImage: normalizeImageUrl(edge.node.bannerImage),
        colorHex: edge.node.coverImage?.color || null,
        status: mapStatus(edge.node.status),
        format: mapFormat(edge.node.format),
        episodes: edge.node.episodes ?? null,
        chapters: edge.node.chapters ?? null,
        volumes: edge.node.volumes ?? null,
        season: edge.node.season || null,
        seasonYear: edge.node.seasonYear ?? null,
        averageScore: edge.node.averageScore ?? null,
        popularity: edge.node.popularity ?? null,
      },
    }));
};

export const mapTags = (tags: AniListMedia['tags']) => {
  if (!tags) return [];
  return tags.map((tag) => ({
    id: String(tag.id),
    name: tag.name,
    description: tag.description || null,
    rank: tag.rank ?? null,
    isSpoiler: Boolean(tag.isMediaSpoiler),
  }));
};

export const mapExternalLinks = (links: AniListMedia['externalLinks']) => {
  if (!links) return [];
  return links
    .map((link) => ({
      id: String(link.id),
      url: link.url,
      site: link.site,
      icon: link.icon || null,
      color: link.color || null,
    }))
    .filter((link) => {
      try {
        const parsed = new URL(link.url);
        return ['http:', 'https:'].includes(parsed.protocol);
      } catch {
        return false;
      }
    });
};

export const mapRecommendations = (
  recommendations: AniListMedia['recommendations'],
) => {
  if (!recommendations?.edges) return [];
  return recommendations.edges
    .filter((edge) => edge?.node?.mediaRecommendation)
    .map((edge, index) => {
      const rec = edge.node.mediaRecommendation;
      return {
        score: edge.node.rating ?? null,
        rank: index + 1,
        media: {
          id: String(rec.id),
          providerId: String(rec.id),
          provider: 'ANILIST',
          title: {
            english: rec.title?.english || null,
            romaji: rec.title?.romaji || null,
            native: rec.title?.native || null,
          },
          coverImage: {
            extraLarge: normalizeImageUrl(
              rec.coverImage?.extraLarge || rec.coverImage?.large,
            ),
            large: normalizeImageUrl(rec.coverImage?.large),
            color: rec.coverImage?.color || null,
          },
          bannerImage: normalizeImageUrl(rec.bannerImage),
          colorHex: rec.coverImage?.color || null,
          status: mapStatus(rec.status),
          format: mapFormat(rec.format),
          episodes: rec.episodes ?? null,
          chapters: rec.chapters ?? null,
          volumes: rec.volumes ?? null,
          season: rec.season || null,
          seasonYear: rec.seasonYear ?? null,
          averageScore: rec.averageScore ?? null,
          popularity: rec.popularity ?? null,
        },
      };
    });
};

export const mapAiring = (media: AniListMedia) => {
  if (media.status !== 'RELEASING' && media.status !== 'NOT_YET_RELEASED') {
    return null;
  }
  if (!media.nextAiringEpisode) return null;

  const next = {
    episode: media.nextAiringEpisode.episode,
    airingAt: media.nextAiringEpisode.airingAt,
  };

  const upcoming =
    media.airingSchedule?.nodes
      ?.map((node) => ({ episode: node.episode, airingAt: node.airingAt }))
      .filter((node) => node.airingAt >= next.airingAt)
      .sort((a, b) => a.airingAt - b.airingAt) || [];

  let cadence: 'WEEKLY' | 'BIWEEKLY' | 'DAILY' | 'IRREGULAR' | 'UNKNOWN' =
    'UNKNOWN';
  let confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN' = 'LOW';

  if (upcoming.length >= 2) {
    const intervals: number[] = [];
    for (let i = 1; i < upcoming.length; i++) {
      intervals.push(upcoming[i].airingAt - upcoming[i - 1].airingAt);
    }

    const WEEK_SECONDS = 604800;
    const DAY_SECONDS = 86400;
    const MARGIN = 3600;

    if (intervals.every((diff) => Math.abs(diff - WEEK_SECONDS) <= MARGIN)) {
      cadence = 'WEEKLY';
      confidence = upcoming.length >= 3 ? 'HIGH' : 'MEDIUM';
    } else if (
      intervals.every((diff) => Math.abs(diff - WEEK_SECONDS * 2) <= MARGIN)
    ) {
      cadence = 'BIWEEKLY';
      confidence = 'MEDIUM';
    } else if (
      intervals.every((diff) => Math.abs(diff - DAY_SECONDS) <= MARGIN)
    ) {
      cadence = 'DAILY';
      confidence = 'MEDIUM';
    } else {
      cadence = 'IRREGULAR';
      confidence = 'MEDIUM';
    }
  } else if (upcoming.length === 1) {
    cadence = 'WEEKLY';
    confidence = 'LOW';
  }

  return {
    nextEpisode: next,
    upcomingEpisodes: upcoming,
    cadence,
    cadenceConfidence: confidence,
    updatedAt: new Date().toISOString(),
  };
};

export const mapVoiceLanguages = (characters?: AniListMedia['characters']) => {
  const languagesMap = new Map<string, string>();

  if (characters?.edges) {
    for (const edge of characters.edges) {
      for (const va of edge.voiceActors || []) {
        if (va.languageV2) {
          const normalizedKey = va.languageV2.trim().toLowerCase();
          const code =
            LANGUAGE_CODE_MAP[normalizedKey] || normalizedKey.substring(0, 2);
          languagesMap.set(code, va.languageV2);
        }
      }
    }
  }

  const languages = Array.from(languagesMap.entries()).map(([code, name]) => ({
    code,
    name,
  }));

  return {
    languages,
    status: (languages.length > 0 ? 'AVAILABLE' : 'NONE_LISTED') as
      | 'AVAILABLE'
      | 'PARTIAL'
      | 'NONE_LISTED'
      | 'UNKNOWN',
  };
};
