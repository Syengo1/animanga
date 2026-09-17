import { apiClient } from "@animanga/api-client";
import { VoidHero } from "@/features/home/void-hero";
import { HomeClientOrchestrator } from "@/features/home/home-client-orchestrator";
import { NewsletterCTA } from "@/components/layout/newsletter-cta";

// Safely drill down through ANY number of interceptor envelopes to find the Array
function extractArray(obj: any): any[] {
  if (!obj) return [];
  if (Array.isArray(obj)) return obj;
  if (typeof obj === "object" && "data" in obj) {
    return extractArray(obj.data);
  }
  return [];
}

// Safely drill down to find the Discovery object containing our feeds
function extractDiscoveryData(obj: any): any {
  if (!obj) return null;
  if (obj.trendingThisWeek) return obj;
  if (typeof obj === "object" && "data" in obj) {
    return extractDiscoveryData(obj.data);
  }
  return null;
}

export default async function HomePage() {
  let discoveryRes: any, popMangaRes: any, trendMangaRes: any;

  try {
    [discoveryRes, popMangaRes, trendMangaRes] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      (apiClient as any).GET("/api/v1/discovery/home", {
        next: { revalidate: 300 },
      }),
      apiClient.GET("/api/v1/media/search", {
        params: {
          query: { limit: 15, type: "MANGA", sort: "POPULARITY_DESC" } as any,
        },
        next: { revalidate: 300 },
      }),
      apiClient.GET("/api/v1/media/search", {
        params: {
          query: { limit: 15, type: "MANGA", sort: "TRENDING_DESC" } as any,
        },
        next: { revalidate: 300 },
      }),
    ]);
  } catch (error) {
    // Gracefully catch ECONNREFUSED network errors during Vercel's build-time pre-rendering
    console.error(
      "Network error fetching discovery feeds during render:",
      error,
    );
  }

  // Recursively unwrap the payloads based on the wire format
  // Safe navigation (?.) ensures these don't throw if the responses are undefined from a caught error
  const discoveryData = extractDiscoveryData(discoveryRes?.data);
  const popMangaData = extractArray(popMangaRes?.data);
  const trendMangaData = extractArray(trendMangaRes?.data);

  const animeCategories = [];

  if (discoveryData) {
    if (discoveryData.trendingThisWeek?.items?.length) {
      animeCategories.push({
        id: discoveryData.trendingThisWeek.key,
        title: discoveryData.trendingThisWeek.title,
        href: "/search/anime?sort=TRENDING",
        items: discoveryData.trendingThisWeek.items,
      });
    }
    if (discoveryData.newReleases?.items?.length) {
      animeCategories.push({
        id: discoveryData.newReleases.key,
        title: discoveryData.newReleases.title,
        href: "/search/anime?status=RELEASING",
        items: discoveryData.newReleases.items,
      });
    }
    if (discoveryData.currentlyAiring?.items?.length) {
      animeCategories.push({
        id: discoveryData.currentlyAiring.key,
        title: discoveryData.currentlyAiring.title,
        href: "/search/anime?status=RELEASING",
        items: discoveryData.currentlyAiring.items,
      });
    }
    if (discoveryData.upcomingReleases?.items?.length) {
      animeCategories.push({
        id: discoveryData.upcomingReleases.key,
        title: discoveryData.upcomingReleases.title,
        href: "/search/anime?status=NOT_YET_RELEASED",
        items: discoveryData.upcomingReleases.items,
      });
    }
    if (discoveryData.popularThisSeason?.items?.length) {
      animeCategories.push({
        id: discoveryData.popularThisSeason.key,
        title: discoveryData.popularThisSeason.title,
        href: "/search/anime?season=CURRENT",
        items: discoveryData.popularThisSeason.items,
      });
    }
  }

  const animeData = {
    // Explicitly check for undefined responses in case the try/catch trapped an exception
    error:
      !discoveryRes || discoveryRes.error
        ? "Failed to load discovery feeds"
        : null,
    categories: animeCategories,
  };

  const mangaData = {
    error:
      !popMangaRes || !trendMangaRes || popMangaRes.error || trendMangaRes.error
        ? "Failed to load manga feeds"
        : null,
    categories: [
      {
        id: "trend-m",
        title: "Trending Manga",
        href: "/search/manga?sort=TRENDING",
        items: trendMangaData,
      },
      {
        id: "pop-m",
        title: "All-Time Popular Manga",
        href: "/search/manga?sort=POPULAR",
        items: popMangaData,
      },
    ].filter((c) => c.items.length > 0),
  };

  return (
    <div className="flex flex-col min-h-screen">
      <VoidHero />
      <HomeClientOrchestrator animeData={animeData} mangaData={mangaData} />
      <NewsletterCTA />
    </div>
  );
}
