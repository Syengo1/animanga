// C:\Projects\animanga-platform\apps\web\src\app\(public)\search\[type]\page.tsx
import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { Tv, BookOpen, ChevronRight } from "lucide-react";
import { serverFetch } from "@/lib/api/server-fetch";
import {
  parseCatalogQuery,
  buildBackendCatalogParams,
  buildCatalogSearchParams,
  CatalogPageResponse,
} from "@/features/search/catalog-query";
import { CatalogToolbar } from "@/features/search/catalog-toolbar";
import { CatalogGrid } from "@/features/search/catalog-grid";
import { cn } from "@/lib/utils";

type PageProps = {
  params: Promise<{ type: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { type: rawType } = await params;
  const rawSearch = await searchParams;
  const cleanType = rawType.toLowerCase();

  if (cleanType !== "anime" && cleanType !== "manga") {
    return { title: "Not Found" };
  }

  const query = parseCatalogQuery(rawSearch);
  const label = cleanType === "anime" ? "Anime" : "Manga";
  const statePrefix =
    query.releaseState === "UNRELEASED" ? "Upcoming & Unreleased " : "";
  const titleQuery = query.q ? `"${query.q}" in ` : "";

  const title = `${titleQuery}${statePrefix}${label} Catalog${
    query.page > 1 ? ` - Page ${query.page}` : ""
  }`;
  const description = `Browse, search, and filter ${statePrefix.toLowerCase()}${label.toLowerCase()} by popularity, rating, release date, episode count, format, and genres on Animanga.`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Animanga`,
      description,
    },
  };
}

export default async function SearchCatalogPage({
  params,
  searchParams,
}: PageProps) {
  const { type: rawType } = await params;
  const rawSearch = await searchParams;

  const cleanType = rawType.toLowerCase();
  if (cleanType !== "anime" && cleanType !== "manga") {
    notFound();
  }

  const routeType = cleanType as "anime" | "manga";
  const mediaType = cleanType.toUpperCase() as "ANIME" | "MANGA";
  const normalizedQuery = parseCatalogQuery(rawSearch);

  let payload: CatalogPageResponse = {
    items: [],
    pagination: {
      currentPage: normalizedQuery.page,
      totalPages: 1,
      totalItems: 0,
      limit: normalizedQuery.limit,
    },
  };

  try {
    const backendParams = buildBackendCatalogParams(mediaType, normalizedQuery);
    const response = await serverFetch<any>(
      `/api/v1/media/catalog?${backendParams.toString()}`,
      { next: { revalidate: 60 } },
    );

    const unwrapped = response?.data?.pagination
      ? response.data
      : response?.data?.data || response;

    if (unwrapped?.items && unwrapped?.pagination) {
      payload = unwrapped as CatalogPageResponse;
    }
  } catch (error) {
    console.error(`Failed to load ${routeType} catalog page:`, error);
  }

  // Preserve search query & sort when switching between Anime and Manga tabs
  const switchQuery = buildCatalogSearchParams({
    q: normalizedQuery.q,
    sort: normalizedQuery.sort,
    releaseState: normalizedQuery.releaseState,
    genre: normalizedQuery.genre,
    page: 1,
  }).toString();

  const animeHref = switchQuery
    ? `/search/anime?${switchQuery}`
    : "/search/anime";
  const mangaHref = switchQuery
    ? `/search/manga?${switchQuery}`
    : "/search/manga";

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${routeType === "anime" ? "Anime" : "Manga"} Catalog`,
    description: `Explore ${payload.pagination.totalItems} ${routeType} titles on Animanga.`,
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />

      {/* Compact, High-Contrast Catalog Header */}
      <div className="border-b border-border bg-gradient-to-b from-primary/10 via-background to-background pt-8 pb-6">
        <div className="container mx-auto px-4">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4"
          >
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-primary">
              {routeType === "anime" ? "Anime Catalog" : "Manga Catalog"}
            </span>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight uppercase text-foreground">
                Explore{" "}
                <span className="text-primary">
                  {routeType === "anime" ? "Anime" : "Manga"}
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-1">
                {normalizedQuery.releaseState === "UNRELEASED"
                  ? `Showing upcoming & unreleased ${routeType} scheduled to premiere.`
                  : `Showing released and currently airing ${routeType}. Unreleased titles are filtered out cleanly.`}
              </p>
            </div>

            {/* Quick Anime <-> Manga Switcher */}
            <div className="inline-flex p-1 rounded-xl bg-secondary border border-border self-start sm:self-auto">
              <Link
                href={animeHref}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all",
                  routeType === "anime"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Tv className="w-3.5 h-3.5" />
                Anime
              </Link>
              <Link
                href={mangaHref}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all",
                  routeType === "manga"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Manga
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Search, Filter Toolbar & Finite Paginated Grid */}
      <div className="container mx-auto px-4 pt-6">
        <CatalogToolbar
          routeType={routeType}
          mediaType={mediaType}
          query={normalizedQuery}
          totalItems={payload.pagination.totalItems}
        />

        <CatalogGrid
          items={payload.items}
          pagination={payload.pagination}
          normalizedQuery={normalizedQuery}
          routeType={routeType}
        />
      </div>
    </div>
  );
}
