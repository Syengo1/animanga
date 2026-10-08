import { notFound, redirect } from "next/navigation";
import { serverFetch, ServerFetchError } from "@/lib/api/server-fetch";
import { CatalogShell } from "@/features/catalog/catalog-shell";
import { MediaCard } from "@/components/shared/media-card";
import { Pagination } from "@/components/shared/pagination";

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
  params: Promise<{ type: string; id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

// HARD BLOCK GARBAGE ROUTES
const isValidRouteId = (id: string) =>
  !/^(appspecific|favicon\.ico|_next)$/i.test(id);

export async function generateMetadata({ params }: PageProps) {
  const { type, id } = await params;

  if (!isValidRouteId(id)) return { title: "Not Found | Animanga" };

  if (id in CATEGORY_CONFIG) {
    const config = CATEGORY_CONFIG[id as keyof typeof CATEGORY_CONFIG];
    return {
      title: `${config.title} | Animanga`,
      description: config.description,
    };
  }
  return { title: "Animanga" };
}

export default async function CategoryOrRedirectPage({
  params,
  searchParams,
}: PageProps) {
  const { type, id } = await params;
  const cleanType = type.toLowerCase();

  if (!isValidRouteId(id) || (cleanType !== "anime" && cleanType !== "manga")) {
    notFound();
  }

  // 1. IS IT A CATEGORY PAGE?
  if (id in CATEGORY_CONFIG) {
    const config = CATEGORY_CONFIG[id as keyof typeof CATEGORY_CONFIG];
    const resolvedSearch = await searchParams;
    const rawPage = resolvedSearch.page;
    const pageStr = Array.isArray(rawPage) ? rawPage[0] : rawPage;
    const page = Math.max(1, parseInt(pageStr || "1", 10) || 1);

    let payload: any = {
      items: [],
      pagination: { totalPages: 1, totalItems: 0 },
    };
    try {
      const query = new URLSearchParams({
        type: cleanType.toUpperCase(),
        page: page.toString(),
        limit: "24",
        ...config.apiParams,
      });
      const response = await serverFetch<any>(
        `/api/v1/media/catalog?${query.toString()}`,
      );
      payload = response.data?.pagination
        ? response.data
        : response.data?.data || payload;
    } catch (error) {
      console.error(`Failed to fetch catalog for ${id}:`, error);
    }

    const items = payload?.items || [];
    return (
      <CatalogShell
        title={config.title}
        description={config.description}
        mediaType={cleanType as "anime" | "manga"}
        totalItems={payload?.pagination?.totalItems || 0}
      >
        {items.length === 0 ? (
          <div className="py-32 flex flex-col items-center justify-center text-center border border-dashed border-border rounded-2xl bg-background/20">
            <p className="text-xl font-bold text-foreground/60 mb-2">
              No {cleanType} found.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] lg:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4 sm:gap-6">
              {items.map((item: any, idx: number) => (
                <MediaCard
                  key={item.id}
                  media={item}
                  mediaType={cleanType as "anime" | "manga"}
                  priority={idx < 8}
                />
              ))}
            </div>
            <Pagination
              currentPage={page}
              totalPages={payload?.pagination?.totalPages || 1}
              createPageUrl={(p) => `/${cleanType}/${id}?page=${p}`}
            />
          </>
        )}
      </CatalogShell>
    );
  }

  // 2. IS IT A MEDIA LOOKUP?
  let targetSlug: string | null = null;

  try {
    const response = await serverFetch<any>(`/api/v1/media/${id}/details`, {
      next: { revalidate: 3600 },
    });

    // CRITICAL FIX: Unwrap the NestJS { success: true, data: { ... } } envelope!
    const media = response?.data || response;

    if (media && media.slug) {
      targetSlug = media.slug;
    }
  } catch (error) {
    if (error instanceof ServerFetchError) {
      if (error.status === 404) notFound(); // Genuine 404
      throw new Error(
        `Provider Data Synchronization Failed: HTTP ${error.status}`,
      ); // 502/500 Provider failures
    }
    throw error;
  }

  // Execute the redirect outside the try/catch block
  if (targetSlug) {
    redirect(`/${cleanType}/${id}/${targetSlug}`);
  }

  notFound();
}
