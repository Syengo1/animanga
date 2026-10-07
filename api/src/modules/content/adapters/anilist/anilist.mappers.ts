import { AniListMedia } from './anilist.types';

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
  ];
  return validStatuses.includes(status || '') ? status : 'UNKNOWN';
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
  ];
  return validFormats.includes(format || '') ? format : 'UNKNOWN';
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
  ];
  return validRelations.includes(type || '') ? type : 'OTHER';
};

const mapRole = (role?: string | null) => {
  const validRoles = ['MAIN', 'SUPPORTING', 'BACKGROUND'];
  return validRoles.includes(role || '') ? role : 'UNKNOWN';
};

export const mapStudios = (studios: AniListMedia['studios']) => {
  if (!studios?.edges) return [];
  return studios.edges.map((edge) => ({
    id: String(edge.node.id),
    name: edge.node.name,
    isMain: edge.isMain || false,
    isAnimationStudio: edge.node.isAnimationStudio || false,
  }));
};

export const mapCharacters = (characters: AniListMedia['characters']) => {
  if (!characters?.edges) return [];
  return characters.edges.map((edge) => {
    const voiceActor = edge.voiceActors?.[0];
    return {
      id: String(edge.node.id),
      name: edge.node.name?.full || 'Unknown',
      characterName: null,
      image: normalizeImageUrl(edge.node.image?.large),
      role: mapRole(edge.role),
      roleNotes: null,
      voiceActors: voiceActor
        ? [
            {
              id: String(voiceActor.id),
              name: voiceActor.name?.full || 'Unknown',
              language: voiceActor.languageV2 || 'Unknown',
              image: normalizeImageUrl(voiceActor.image?.large),
            },
          ]
        : [],
    };
  });
};

export const mapStaff = (staff: AniListMedia['staff']) => {
  if (!staff?.edges) return [];
  return staff.edges.map((edge) => ({
    id: String(edge.node.id),
    name: edge.node.name?.full || 'Unknown',
    image: normalizeImageUrl(edge.node.image?.large),
    roles: edge.role ? [edge.role] : [],
  }));
};

export const mapRelations = (relations: AniListMedia['relations']) => {
  if (!relations?.edges) return [];
  return relations.edges.map((edge) => ({
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
      episodes: edge.node.episodes || null,
      chapters: edge.node.chapters || null,
      volumes: edge.node.volumes || null,
      season: edge.node.season || null,
      seasonYear: edge.node.seasonYear || null,
      averageScore: edge.node.averageScore || null,
      popularity: edge.node.popularity || null,
    },
  }));
};

// --- NEW INTELLIGENCE MAPPERS BELOW ---

export const mapTags = (tags: AniListMedia['tags']) => {
  if (!tags) return [];
  return tags.map((tag) => ({
    id: String(tag.id),
    name: tag.name,
    description: tag.description || null,
    rank: tag.rank || null,
    isSpoiler: tag.isMediaSpoiler || false,
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
      // Safety check: Zod .url() will throw a 502 if AniList returns a malformed string
      try {
        new URL(link.url);
        return true;
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
    .filter((edge) => edge.node.mediaRecommendation)
    .map((edge, index) => {
      const rec = edge.node.mediaRecommendation;
      return {
        score: edge.node.rating || null,
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
          episodes: rec.episodes || null,
          chapters: rec.chapters || null,
          volumes: rec.volumes || null,
          season: rec.season || null,
          seasonYear: rec.seasonYear || null,
          averageScore: rec.averageScore || null,
          popularity: rec.popularity || null,
        },
      };
    });
};

export const mapAiring = (media: AniListMedia) => {
  if (media.status !== 'RELEASING' && media.status !== 'NOT_YET_RELEASED')
    return null;
  if (!media.nextAiringEpisode) return null;

  const next = {
    episode: media.nextAiringEpisode.episode,
    airingAt: media.nextAiringEpisode.airingAt,
  };

  const upcoming =
    media.airingSchedule?.nodes
      ?.map((node) => ({ episode: node.episode, airingAt: node.airingAt }))
      .filter((node) => node.airingAt >= next.airingAt) // Ensure historical episodes don't corrupt the math
      .sort((a, b) => a.airingAt - b.airingAt) || [];

  let cadence: 'WEEKLY' | 'BIWEEKLY' | 'DAILY' | 'IRREGULAR' | 'UNKNOWN' =
    'UNKNOWN';
  let confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN' = 'LOW';

  if (upcoming.length >= 2) {
    const intervals: number[] = [];
    for (let i = 1; i < upcoming.length; i++) {
      intervals.push(upcoming[i].airingAt - upcoming[i - 1].airingAt);
    }

    // ~7 Days in seconds (604,800). Margin of 1 Hour (3,600) for daylight savings / broadcast drift.
    const WEEK_SECONDS = 604800;
    const MARGIN = 3600;

    const isWeekly = intervals.every(
      (diff) => Math.abs(diff - WEEK_SECONDS) <= MARGIN,
    );

    if (isWeekly) {
      cadence = 'WEEKLY';
      confidence = upcoming.length >= 3 ? 'HIGH' : 'MEDIUM';
    } else {
      cadence = 'IRREGULAR';
      confidence = 'MEDIUM';
    }
  } else if (upcoming.length === 1) {
    // We only have the next episode. Assume weekly but alert the UI that confidence is low.
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
    characters.edges.forEach((edge) => {
      edge.voiceActors?.forEach((va) => {
        if (va.languageV2) {
          // Extract a consistent shortcode (e.g., "Japanese" -> "ja", "English" -> "en")
          const code = va.languageV2.substring(0, 2).toLowerCase();
          languagesMap.set(code, va.languageV2);
        }
      });
    });
  }

  const languages = Array.from(languagesMap.entries()).map(([code, name]) => ({
    code,
    name,
  }));

  return {
    languages,
    status: languages.length > 0 ? 'AVAILABLE' : 'NONE_LISTED',
  };
};
