// C:\Projects\animanga-platform\apps\web\src\app\api\schedule\route.ts
import { NextResponse } from "next/server";

export interface ScheduleApiItem {
  scheduleId: number;
  mediaId: number;
  episode: number;
  airingAt: number; // Unix timestamp in seconds
  title: {
    english: string | null;
    romaji: string | null;
    native: string | null;
  };
  coverImage: string | null;
  colorHex: string | null;
  format: string | null;
}

export interface ScheduleApiResponse {
  generatedAt: string;
  items: ScheduleApiItem[];
}

interface AniListScheduleNode {
  id: number;
  airingAt: number;
  episode: number;
  media: {
    id: number;
    isAdult: boolean;
    format: string | null;
    title: {
      english: string | null;
      romaji: string | null;
      native: string | null;
    } | null;
    coverImage: {
      large: string | null;
      color: string | null;
    } | null;
  } | null;
}

interface AniListSchedulePageResponse {
  data?: {
    Page?: {
      pageInfo?: {
        hasNextPage?: boolean;
      };
      airingSchedules?: AniListScheduleNode[];
    };
  };
}

const ANILIST_GRAPHQL_URL = "https://graphql.anilist.co";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const AIRING_SCHEDULE_QUERY = `
  query AiringScheduleWindow($page: Int, $perPage: Int, $airingAtGreater: Int, $airingAtLesser: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        hasNextPage
      }
      airingSchedules(
        airingAt_greater: $airingAtGreater
        airingAt_lesser: $airingAtLesser
        sort: TIME
      ) {
        id
        airingAt
        episode
        media {
          id
          isAdult
          format
          title {
            english
            romaji
            native
          }
          coverImage {
            large
            color
          }
        }
      }
    }
  }
`;

let memoryCache: { expiresAt: number; data: ScheduleApiResponse } | null = null;

async function fetchSchedulePage(
  page: number,
  airingAtGreater: number,
  airingAtLesser: number,
): Promise<{ items: ScheduleApiItem[]; hasNextPage: boolean }> {
  const res = await fetch(ANILIST_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      query: AIRING_SCHEDULE_QUERY,
      variables: {
        page,
        perPage: 50,
        airingAtGreater,
        airingAtLesser,
      },
    }),
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    throw new Error(`AniList schedule HTTP ${res.status}`);
  }

  const json = (await res.json()) as AniListSchedulePageResponse;
  const rawNodes = json?.data?.Page?.airingSchedules ?? [];
  const hasNextPage = Boolean(json?.data?.Page?.pageInfo?.hasNextPage);

  const items: ScheduleApiItem[] = [];
  for (const node of rawNodes) {
    if (!node.media || node.media.isAdult) continue;
    items.push({
      scheduleId: node.id,
      mediaId: node.media.id,
      episode: node.episode,
      airingAt: node.airingAt,
      title: {
        english: node.media.title?.english ?? null,
        romaji: node.media.title?.romaji ?? null,
        native: node.media.title?.native ?? null,
      },
      coverImage: node.media.coverImage?.large ?? null,
      colorHex: node.media.coverImage?.color ?? null,
      format: node.media.format ?? null,
    });
  }

  return { items, hasNextPage };
}

export async function GET() {
  const nowMs = Date.now();

  if (memoryCache && nowMs < memoryCache.expiresAt) {
    return NextResponse.json(memoryCache.data, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  }

  // Start 28 hours ago so every visitor timezone's full "Today" (including already-released episodes) is covered
  const nowSec = Math.floor(nowMs / 1000);
  const airingAtGreater = nowSec - 28 * 60 * 60;
  const airingAtLesser = nowSec + 7 * 24 * 60 * 60;

  try {
    const allItems: ScheduleApiItem[] = [];
    const seenScheduleIds = new Set<number>();

    for (let page = 1; page <= 3; page++) {
      const { items, hasNextPage } = await fetchSchedulePage(
        page,
        airingAtGreater,
        airingAtLesser,
      );

      for (const item of items) {
        if (!seenScheduleIds.has(item.scheduleId)) {
          seenScheduleIds.add(item.scheduleId);
          allItems.push(item);
        }
      }

      if (!hasNextPage) break;
    }

    allItems.sort((a, b) => a.airingAt - b.airingAt);

    const payload: ScheduleApiResponse = {
      generatedAt: new Date(nowMs).toISOString(),
      items: allItems,
    };

    memoryCache = {
      expiresAt: nowMs + CACHE_TTL_MS,
      data: payload,
    };

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error: unknown) {
    if (memoryCache) {
      return NextResponse.json(memoryCache.data, {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      });
    }

    const message =
      error instanceof Error ? error.message : "Failed to load schedule";
    return NextResponse.json(
      { generatedAt: new Date(nowMs).toISOString(), items: [], error: message },
      { status: 502 },
    );
  }
}
