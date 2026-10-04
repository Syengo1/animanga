import { notFound } from "next/navigation";
import { z } from "zod";
import { serverFetch } from "@/lib/api/server-fetch";
import { CatalogShell } from "@/features/catalog/catalog-shell";
import { MediaCard } from "@/components/shared/media-card";
import { Pagination } from "@/components/shared/pagination";

// 1. Zod Validation for Route Params (Relaxed strictness to prevent Next.js hidden param issues)
const RouteParamsSchema = z.object({
  mediaType: z.enum(["anime", "manga"]),
  category: z.enum([
    "trending",
    "new-releases",
    "airing",
    "upcoming",
    "popular",
  ]),
});

// 2. Canonical Configuration
const CATEGORY_CONFIG = {
  trending: {
    title: "Trending This Week",
    description: "Titles generating the strongest recent activity.",
    apiParams: { sort: "TRENDING_DESC" },
  },
  "new-releases": {
    title: "New Releases",
    description: "Fresh titles that have recently begun releasing.",
    apiParams: { status: "RELEASING", sort: "START_DATE_DESC" },
  },
  airing: {
    title: "Currently Airing",
    description: "Titles currently releasing new episodes.",
    apiParams: { status: "RELEASING", sort: "POPULARITY_DESC" },
  },
  upcoming: {
    title: "Upcoming Releases",
    description: "Highly anticipated titles scheduled to premiere soon.",
    apiParams: { status: "NOT_YET_RELEASED", sort: "POPULARITY_DESC" },
  },
  popular: {
    title: "Popular This Season",
    description: "The biggest hits of the current lineup.",
    apiParams: { season: "CURRENT", sort: "POPULARITY_DESC" },
  },
};

type PageProps = {
  params: Promise<{ mediaType: string; category: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

// 3. Dynamic SEO Metadata
export async function generateMetadata({ params }: PageProps) {
  const resolvedParams = await params;
  const parsed = RouteParamsSchema.safeParse(resolvedParams);
  if (!parsed.success) return { title: "Not Found" };

  const config =
    CATEGORY_CONFIG[parsed.data.category as keyof typeof CATEGORY_CONFIG];
  return {
    title: `${config.title} | Animanga`,
    description: config.description,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: PageProps) {
  // 4. Validate Next.js 16 Promise Props
  const resolvedParams = await params;
  const parsedParams = RouteParamsSchema.safeParse(resolvedParams);

  if (!parsedParams.success) {
    notFound();
  }

  const { mediaType, category } = parsedParams.data;
  const config = CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG];

  // 5. Safely Parse Page Parameter (Avoids Zod Coercion Errors on Arrays/Undefined)
  const resolvedSearch = await searchParams;
  const rawPage = resolvedSearch.page;
  const pageStr = Array.isArray(rawPage) ? rawPage[0] : rawPage;
  const page = Math.max(1, parseInt(pageStr || "1", 10) || 1);
  const limit = 24;

  // 6. Build Backend Query
  const query = new URLSearchParams({
    type: mediaType.toUpperCase(),
    page: page.toString(),
    limit: limit.toString(),
    ...config.apiParams,
  });

  // Fetch Data
  let payload: any = {
    items: [],
    pagination: { totalPages: 1, totalItems: 0 },
  };
  try {
    const response = await serverFetch<any>(
      `/api/v1/media/catalog?${query.toString()}`,
    );
    // Safely unwrap double envelope if it exists
    payload = response.data?.pagination
      ? response.data
      : response.data?.data || payload;
  } catch (error) {
    console.error(`Failed to fetch catalog for ${category}:`, error);
  }

  const items = payload?.items || [];
  const totalPages = payload?.pagination?.totalPages || 1;
  const totalItems = payload?.pagination?.totalItems || 0;

  // 7. Pagination Link Generator
  const createPageUrl = (pageNumber: number) => {
    return `/${mediaType}/${category}?page=${pageNumber}`;
  };

  return (
    <CatalogShell
      title={config.title}
      description={config.description}
      mediaType={mediaType as "anime" | "manga"}
      totalItems={totalItems}
    >
      {items.length === 0 ? (
        <div className="py-32 flex flex-col items-center justify-center text-center border border-dashed border-white/10 rounded-2xl bg-black/20">
          <p className="text-xl font-bold text-white/60 mb-2">
            No {mediaType} found.
          </p>
          <p className="text-sm text-white/40">
            Try adjusting your filters or check back later.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] lg:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4 sm:gap-6">
            {items.map((item: any, idx: number) => (
              <MediaCard
                key={item.id}
                media={item}
                mediaType={mediaType as "anime" | "manga"}
                priority={idx < 8}
              />
            ))}
          </div>

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            createPageUrl={createPageUrl}
          />
        </>
      )}
    </CatalogShell>
  );
}
