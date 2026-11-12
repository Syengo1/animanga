// C:\Projects\animanga-platform\apps\web\src\features\search\catalog-grid.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { LayoutGrid, Grid3X3, RotateCcw, CalendarClock } from "lucide-react";
import { MediaCard, MediaCardData } from "@/components/shared/media-card";
import { Pagination } from "@/components/shared/pagination";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  NormalizedCatalogQuery,
  buildCatalogSearchParams,
} from "./catalog-query";

interface CatalogGridProps {
  items: MediaCardData[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
  };
  normalizedQuery: NormalizedCatalogQuery;
  routeType: "anime" | "manga";
}

export function CatalogGrid({
  items,
  pagination,
  normalizedQuery,
  routeType,
}: CatalogGridProps) {
  const [density, setDensity] = useState<"comfortable" | "compact">(
    "comfortable",
  );

  const createPageUrl = (targetPage: number) => {
    const sp = buildCatalogSearchParams({
      ...normalizedQuery,
      page: targetPage,
    });
    const qs = sp.toString();
    return qs ? `/search/${routeType}?${qs}` : `/search/${routeType}`;
  };

  if (!items || items.length === 0) {
    const isSearchingReleasedOnly = normalizedQuery.releaseState === "RELEASED";
    const unreleasedUrl = (() => {
      const sp = buildCatalogSearchParams({
        ...normalizedQuery,
        releaseState: "UNRELEASED",
        status: "NOT_YET_RELEASED",
        page: 1,
      });
      return `/search/${routeType}?${sp.toString()}`;
    })();

    return (
      <div className="py-20 px-4 text-center border border-dashed border-border rounded-2xl bg-card/50 flex flex-col items-center justify-center gap-4">
        <div className="max-w-md">
          <p className="text-lg font-black text-foreground mb-1">
            No {routeType} matched your current filters.
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {isSearchingReleasedOnly
              ? "Unreleased titles are hidden by default so they don't mix with released media. Looking for an upcoming release?"
              : "Try broadening your search query, removing a genre tag, or resetting your filters."}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href={`/search/${routeType}`}
            className={cn(
              buttonVariants({ variant: "default" }),
              "h-10 px-5 rounded-xl font-bold text-xs gap-2",
            )}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset All Filters
          </Link>

          {isSearchingReleasedOnly && (
            <Link
              href={unreleasedUrl}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-10 px-5 rounded-xl font-bold text-xs gap-2 bg-card hover:bg-accent",
              )}
            >
              <CalendarClock className="w-3.5 h-3.5 text-amber-500" />
              Search Unreleased {routeType === "anime" ? "Anime" : "Manga"}
            </Link>
          )}
        </div>
      </div>
    );
  }

  const startIdx = (pagination.currentPage - 1) * pagination.limit + 1;
  const endIdx = Math.min(
    pagination.currentPage * pagination.limit,
    pagination.totalItems,
  );

  return (
    <div className="flex flex-col w-full">
      {/* Subtle Sub-bar: Showing X-Y of Z + Grid Density Toggle */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-muted-foreground">
          Showing{" "}
          <span className="font-bold text-foreground">
            {startIdx}–{endIdx}
          </span>{" "}
          of{" "}
          <span className="font-bold text-foreground">
            {pagination.totalItems.toLocaleString()}
          </span>{" "}
          results
        </p>

        <div className="hidden sm:flex items-center gap-1 p-1 rounded-lg bg-secondary border border-border">
          <button
            type="button"
            onClick={() => setDensity("comfortable")}
            aria-label="Comfortable grid view"
            className={cn(
              "p-1.5 rounded-md transition-colors cursor-pointer",
              density === "comfortable"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setDensity("compact")}
            aria-label="Compact grid view"
            className={cn(
              "p-1.5 rounded-md transition-colors cursor-pointer",
              density === "compact"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Grid3X3 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Finite Results Grid */}
      <div
        className={cn(
          "grid gap-4 sm:gap-5",
          density === "comfortable"
            ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
            : "grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8",
        )}
      >
        {items.map((item, idx) => (
          <MediaCard
            key={item.id}
            media={item}
            mediaType={routeType}
            priority={idx < 8}
          />
        ))}
      </div>

      {/* Numbered Pagination with Next/Prev Buttons */}
      <Pagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        createPageUrl={createPageUrl}
      />
    </div>
  );
}
