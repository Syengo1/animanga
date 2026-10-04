import { notFound } from "next/navigation";
import {
  QueryClient,
  dehydrate,
  HydrationBoundary,
} from "@tanstack/react-query";
import { serverFetch } from "@/lib/api/server-fetch";
import {
  parseCatalogQuery,
  catalogQueryKey,
  CatalogPageResponse,
} from "@/features/search/catalog-query";
import { CatalogGrid } from "@/features/search/catalog-grid";

type PageProps = {
  params: Promise<{ type: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

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

  const mediaType = cleanType.toUpperCase() as "ANIME" | "MANGA";
  const normalizedQuery = parseCatalogQuery(rawSearch);
  const queryKey = catalogQueryKey(mediaType, normalizedQuery);

  const queryClient = new QueryClient();

  // Prefetch first keyset page on the server
  await queryClient.prefetchInfiniteQuery({
    queryKey,
    queryFn: async () => {
      const sp = new URLSearchParams({
        type: mediaType,
        sort: normalizedQuery.sort,
        limit: String(normalizedQuery.limit),
      });

      if (normalizedQuery.status) sp.set("status", normalizedQuery.status);
      if (normalizedQuery.format) sp.set("format", normalizedQuery.format);
      if (normalizedQuery.genre) sp.set("genre", normalizedQuery.genre);
      if (normalizedQuery.q) sp.set("search", normalizedQuery.q);

      // We use 'any' here temporarily because serverFetch types expect the raw T,
      // but might receive the double envelope if the backend isn't restarted yet.
      const response = await serverFetch<any>(
        `/api/v1/media/catalog?${sp.toString()}`,
      );

      // FIX: Safely unwrap the payload
      const payload = response.data?.pagination
        ? response.data
        : response.data?.data;

      return payload as CatalogPageResponse;
    },
    initialPageParam: null as string | null,
  });

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <HydrationBoundary state={dehydrate(queryClient)}>
        <CatalogGrid
          mediaType={mediaType}
          normalizedQuery={normalizedQuery}
          routeType={cleanType as "anime" | "manga"}
        />
      </HydrationBoundary>
    </div>
  );
}
