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
