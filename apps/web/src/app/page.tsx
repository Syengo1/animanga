// C:\Projects\animanga-platform\apps\web\src\app\page.tsx
import { apiClient } from "@animanga/api-client";
import { VoidHero } from "@/features/home/void-hero";
import { HomeClientOrchestrator } from "@/features/home/home-client-orchestrator";
import { NewsletterCTA } from "@/components/layout/newsletter-cta";

function extractArray(obj: unknown): unknown[] {
  if (!obj) return [];
  if (Array.isArray(obj)) return obj;
  if (typeof obj === "object" && obj !== null) {
    const record = obj as Record<string, unknown>;
    if ("data" in record) return extractArray(record.data);
    if ("items" in record && Array.isArray(record.items)) return record.items;
  }
  return [];
}

function extractDiscoveryData(obj: unknown): Record<string, any> | null {
  if (!obj || typeof obj !== "object") return null;
  const record = obj as Record<string, any>;
  const hasDiscoveryKeys =
    "trendingThisWeek" in record ||
    "newReleases" in record ||
    "currentlyAiring" in record ||
    "upcomingReleases" in record ||
    "popularThisSeason" in record;

  if (hasDiscoveryKeys) return record;
  if ("data" in record) return extractDiscoveryData(record.data);
  return record;
}

export default async function HomePage() {
  let discoveryRes: any, popMangaRes: any, trendMangaRes: any;

  try {
    [discoveryRes, popMangaRes, trendMangaRes] = await Promise.all([
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
    console.error(
      "Network error fetching discovery feeds during render:",
      error,
    );
  }

  const discoveryData = extractDiscoveryData(discoveryRes?.data);
  const popMangaData = extractArray(popMangaRes?.data);
  const trendMangaData = extractArray(trendMangaRes?.data);

  // Featured items power the LiquidMediaPlayer (Trending This Week)
  const featuredAnime =
    discoveryData?.trendingThisWeek?.items ||
    discoveryData?.popularThisSeason?.items ||
    [];

  // Categories below the player exclude "Trending This Week" to eliminate duplication
  const animeCategories = [];
  if (discoveryData) {
    if (discoveryData.currentlyAiring?.items?.length) {
      animeCategories.push({
        id: "currently-airing",
        title: discoveryData.currentlyAiring.title || "Currently Airing",
        href: "/anime/airing",
        items: discoveryData.currentlyAiring.items,
      });
    }
    if (discoveryData.popularThisSeason?.items?.length) {
      animeCategories.push({
        id: "popular-season",
        title: discoveryData.popularThisSeason.title || "Popular This Season",
        href: "/anime/popular",
        items: discoveryData.popularThisSeason.items,
      });
    }
    if (discoveryData.newReleases?.items?.length) {
      animeCategories.push({
        id: "new-releases",
        title: discoveryData.newReleases.title || "New Releases",
        href: "/anime/new-releases",
        items: discoveryData.newReleases.items,
      });
    }
    if (discoveryData.upcomingReleases?.items?.length) {
      animeCategories.push({
        id: "upcoming-releases",
        title: discoveryData.upcomingReleases.title || "Upcoming Releases",
        href: "/anime/upcoming",
        items: discoveryData.upcomingReleases.items,
      });
    }
  }

  const animeData = {
    error:
      !discoveryRes || discoveryRes.error
        ? "Failed to load discovery feeds"
        : null,
    featured: featuredAnime,
    categories: animeCategories,
  };

  const mangaData = {
    error:
      !popMangaRes || !trendMangaRes || popMangaRes.error || trendMangaRes.error
        ? "Failed to load manga feeds"
        : null,
    featured: trendMangaData.length > 0 ? trendMangaData : popMangaData,
    categories: [
      {
        id: "pop-m",
        title: "All-Time Popular Manga",
        href: "/manga/popular",
        items: popMangaData,
      },
    ].filter((c) => c.items?.length > 0),
  };

  return (
    <div className="flex flex-col min-h-screen">
      <VoidHero />
      <div id="trending-section" className="relative z-30 bg-background">
        <HomeClientOrchestrator animeData={animeData} mangaData={mangaData} />
      </div>
      <NewsletterCTA />
    </div>
  );
}
