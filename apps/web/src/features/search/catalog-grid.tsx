"use client";

import { useEffect, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { MediaCard } from "@/components/shared/media-card";
// FIX: Import the locally defined CatalogPageResponse
import {
  catalogQueryKey,
  NormalizedCatalogQuery,
  CatalogPageResponse,
} from "./catalog-query";

interface CatalogGridProps {
  mediaType: "ANIME" | "MANGA";
  normalizedQuery: NormalizedCatalogQuery;
  routeType: "anime" | "manga";
}

export function CatalogGrid({
  mediaType,
  normalizedQuery,
  routeType,
}: CatalogGridProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const queryKey = catalogQueryKey(mediaType, normalizedQuery);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } =
    useInfiniteQuery({
      queryKey,
      queryFn: async ({ pageParam }) => {
        const baseUrl =
          process.env.NEXT_PUBLIC_API_URL?.replace("localhost", "127.0.0.1") ||
          "http://127.0.0.1:3001";

        const sp = new URLSearchParams({
          type: mediaType,
          sort: normalizedQuery.sort,
          limit: String(normalizedQuery.limit),
        });

        if (normalizedQuery.status) sp.set("status", normalizedQuery.status);
        if (normalizedQuery.format) sp.set("format", normalizedQuery.format);
        if (normalizedQuery.genre) sp.set("genre", normalizedQuery.genre);
        if (normalizedQuery.q) sp.set("search", normalizedQuery.q);
        if (pageParam) sp.set("cursor", pageParam);

        const res = await fetch(
          `${baseUrl}/api/v1/media/catalog?${sp.toString()}`,
          {
            credentials: "include",
          },
        );

        if (!res.ok) throw new Error("Catalog fetch failed");

        const json = await res.json();

        // FIX: Safely unwrap the payload whether it's double-enveloped or perfectly intercepted
        const payload = json.data?.pagination ? json.data : json.data?.data;

        return payload as CatalogPageResponse;
      },
      initialPageParam: null as string | null,
      getNextPageParam: (lastPage) =>
        lastPage.pagination.nextCursor ?? undefined,
      maxPages: 10,
    });

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: "600px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allItems = data?.pages.flatMap((page) => page.items) || [];

  if (status === "success" && allItems.length === 0) {
    return (
      <div className="py-24 text-center border border-dashed border-white/10 rounded-2xl">
        <p className="text-white/60 mb-2">
          No {routeType} matches these filters.
        </p>
        <p className="text-xs text-white/30">
          Adjust your criteria or reset the search query.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 w-full">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] lg:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4 sm:gap-6">
        {allItems.map((item, idx) => (
          <MediaCard
            key={item.id}
            media={item}
            type={routeType}
            priority={idx < 8}
          />
        ))}
      </div>

      <div
        ref={sentinelRef}
        className="py-6 flex justify-center w-full min-h-[80px]"
      >
        {isFetchingNextPage && (
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        )}
      </div>
    </div>
  );
}
