// C:\Projects\animanga-platform\apps\web\src\app\page.tsx
import { Suspense } from "react";
import { serverFetch } from "@/lib/api/server-fetch";
import { VoidHero } from "@/features/home/void-hero";
import { HomeClientOrchestrator } from "@/features/home/home-client-orchestrator";
import { NewsletterCTA } from "@/components/layout/newsletter-cta";

function extractCatalogItems(res: unknown): any[] {
  if (!res || typeof res !== "object") return [];
  const record = res as Record<string, any>;
  const payload = record.data?.pagination
    ? record.data
    : record.data?.data || record;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload)) return payload;
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

function HomeFeedsSkeleton() {
  return (
    <div className="container mx-auto px-4 py-10 space-y-8 animate-pulse">
      <div className="w-full aspect-video md:aspect-[21/9] rounded-3xl bg-secondary/70 border border-border" />
      <div className="space-y-3">
        <div className="h-6 w-48 rounded-lg bg-secondary/70" />
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="shrink-0 w-[145px] sm:w-[165px] md:w-[185px] aspect-[2/3] rounded-xl bg-secondary/60 border border-border"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

async function HomeFeedsContent() {
  const [
    discoveryRes,
    trendMangaRes,
    publishingMangaRes,
    topScoredMangaRes,
    popMangaRes,
  ] = await Promise.allSettled([
    serverFetch("/api/v1/discovery/home", { next: { revalidate: 300 } }),
    serverFetch(
      "/api/v1/media/catalog?type=MANGA&sort=TRENDING_DESC&releaseState=RELEASED&limit=15&page=1",
      { next: { revalidate: 300 } },
    ),
    serverFetch(
      "/api/v1/media/catalog?type=MANGA&status=RELEASING&sort=POPULARITY_DESC&releaseState=RELEASED&limit=15&page=1",
      { next: { revalidate: 300 } },
    ),
    serverFetch(
      "/api/v1/media/catalog?type=MANGA&sort=SCORE_DESC&releaseState=RELEASED&limit=15&page=1",
      { next: { revalidate: 300 } },
    ),
    serverFetch(
      "/api/v1/media/catalog?type=MANGA&sort=POPULARITY_DESC&releaseState=RELEASED&limit=15&page=1",
      { next: { revalidate: 300 } },
    ),
  ]);

  const discoveryData =
    discoveryRes.status === "fulfilled"
      ? extractDiscoveryData(discoveryRes.value)
      : null;

  const trendMangaItems =
    trendMangaRes.status === "fulfilled"
      ? extractCatalogItems(trendMangaRes.value)
      : [];
  const publishingMangaItems =
    publishingMangaRes.status === "fulfilled"
      ? extractCatalogItems(publishingMangaRes.value)
      : [];
  const topScoredMangaItems =
    topScoredMangaRes.status === "fulfilled"
      ? extractCatalogItems(topScoredMangaRes.value)
      : [];
  const popMangaItems =
    popMangaRes.status === "fulfilled"
      ? extractCatalogItems(popMangaRes.value)
      : [];

  const featuredAnime =
    discoveryData?.trendingThisWeek?.items ||
    discoveryData?.popularThisSeason?.items ||
    [];

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
    error: !discoveryData ? "Failed to load discovery feeds" : null,
    featured: featuredAnime,
    categories: animeCategories,
  };

  const mangaCategories = [
    {
      id: "publishing-m",
      title: "Currently Publishing",
      href: "/manga/airing",
      items: publishingMangaItems,
    },
    {
      id: "top-scored-m",
      title: "Highest Rated Manga",
      href: "/search/manga?sort=SCORE_DESC",
      items: topScoredMangaItems,
    },
    {
      id: "pop-m",
      title: "All-Time Popular Manga",
      href: "/manga/popular",
      items: popMangaItems,
    },
  ].filter((c) => c.items.length > 0);

  const mangaData = {
    error:
      trendMangaItems.length === 0 && popMangaItems.length === 0
        ? "Failed to load manga feeds"
        : null,
    featured: trendMangaItems.length > 0 ? trendMangaItems : popMangaItems,
    categories: mangaCategories,
  };

  return <HomeClientOrchestrator animeData={animeData} mangaData={mangaData} />;
}

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <VoidHero />
      <div id="trending-section" className="relative z-30 bg-background">
        <Suspense fallback={<HomeFeedsSkeleton />}>
          <HomeFeedsContent />
        </Suspense>
      </div>
      <NewsletterCTA />
    </div>
  );
}
