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
  if (typeof obj === "object" && "items" in obj && Array.isArray(obj.items)) {
    return obj.items;
  }
  return [];
}

// Safely drill down to find the Discovery object containing our feeds
function extractDiscoveryData(obj: any): any {
  if (!obj) return null;
  const hasDiscoveryKeys =
    "trendingThisWeek" in obj ||
    "newReleases" in obj ||
    "currentlyAiring" in obj ||
    "upcomingReleases" in obj ||
    "popularThisSeason" in obj;
  if (hasDiscoveryKeys) return obj;
  if (typeof obj === "object" && "data" in obj) {
    return extractDiscoveryData(obj.data);
  }
  return obj;
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

  const animeCategories = [];

  if (discoveryData) {
    if (discoveryData.trendingThisWeek?.items?.length) {
      animeCategories.push({
        id: "trending-week",
        title: discoveryData.trendingThisWeek.title || "Trending This Week",
        href: "/anime/trending",
        items: discoveryData.trendingThisWeek.items,
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
    if (discoveryData.currentlyAiring?.items?.length) {
      animeCategories.push({
        id: "currently-airing",
        title: discoveryData.currentlyAiring.title || "Currently Airing",
        href: "/anime/airing",
        items: discoveryData.currentlyAiring.items,
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
    if (discoveryData.popularThisSeason?.items?.length) {
      animeCategories.push({
        id: "popular-season",
        title: discoveryData.popularThisSeason.title || "Popular This Season",
        href: "/anime/popular",
        items: discoveryData.popularThisSeason.items,
      });
    }
  }

  const animeData = {
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
        href: "/manga/trending",
        items: trendMangaData,
      },
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
