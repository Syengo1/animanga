// C:\Projects\animanga-platform\apps\web\src\features\search\catalog-toolbar.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Search,
  SlidersHorizontal,
  X,
  Star,
  Sparkles,
  CalendarClock,
  CheckCircle2,
  Layers,
  ArrowUpDown,
  Loader2,
  RotateCcw,
  Tv,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  NormalizedCatalogQuery,
  buildCatalogSearchParams,
  ANIME_FORMATS,
  MANGA_FORMATS,
  CATALOG_GENRES,
  EPISODE_LENGTH_PRESETS,
  getSortOptions,
  ReleaseStateOption,
  CatalogSortOption,
} from "./catalog-query";
import type { MediaCardData } from "@/components/shared/media-card";

interface CatalogToolbarProps {
  routeType: "anime" | "manga";
  mediaType: "ANIME" | "MANGA";
  query: NormalizedCatalogQuery;
  totalItems: number;
}

const YEARS = Array.from({ length: 38 }, (_, i) => 2027 - i);

export function CatalogToolbar({
  routeType,
  mediaType,
  query,
  totalItems,
}: CatalogToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [searchInput, setSearchInput] = useState(query.q || "");
  const [showFilters, setShowFilters] = useState(false);

  // Predictive Search State
  const [predictions, setPredictions] = useState<MediaCardData[]>([]);
  const [isPredicting, setIsPredicting] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Sync input when URL changes externally
  useEffect(() => {
    setSearchInput(query.q || "");
  }, [query.q]);

  // Close predictive dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced Predictive Search Fetcher
  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed.length < 2) {
      setPredictions([]);
      setIsPredicting(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsPredicting(true);
      try {
        const baseUrl =
          process.env.NEXT_PUBLIC_API_URL?.replace("localhost", "127.0.0.1") ||
          "http://127.0.0.1:3001";

        const sp = new URLSearchParams({
          type: mediaType,
          search: trimmed,
          releaseState: query.releaseState,
          sort: "POPULARITY_DESC",
          limit: "6",
          page: "1",
        });

        const res = await fetch(
          `${baseUrl}/api/v1/media/catalog?${sp.toString()}`,
          {
            signal: controller.signal,
            credentials: "include",
          },
        );

        if (!res.ok) return;
        const json = await res.json();
        const payload = json.data?.pagination ? json.data : json.data?.data;
        setPredictions(payload?.items || []);
        setHighlightedIndex(-1);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setPredictions([]);
        }
      } finally {
        setIsPredicting(false);
      }
    }, 220);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchInput, mediaType, query.releaseState]);

  const navigateWithUpdates = useCallback(
    (updates: Partial<NormalizedCatalogQuery>, resetPage = true) => {
      const merged: Partial<NormalizedCatalogQuery> = {
        ...query,
        ...updates,
        page: resetPage ? 1 : (updates.page ?? query.page),
      };

      // Clean up undefined keys
      (Object.keys(updates) as Array<keyof NormalizedCatalogQuery>).forEach(
        (k) => {
          if (updates[k] === undefined) {
            delete merged[k];
          }
        },
      );

      const sp = buildCatalogSearchParams(merged);
      const qs = sp.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [query, pathname, router],
  );

  const handleSearchSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setIsDropdownOpen(false);
    navigateWithUpdates({ q: searchInput.trim() || undefined });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isDropdownOpen || predictions.length === 0) {
      if (e.key === "Enter") {
        handleSearchSubmit();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < predictions.length - 1 ? prev + 1 : 0,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : predictions.length - 1,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && predictions[highlightedIndex]) {
        const selected = predictions[highlightedIndex];
        setIsDropdownOpen(false);
        router.push(`/${routeType}/${selected.id}`);
      } else {
        handleSearchSubmit();
      }
    } else if (e.key === "Escape") {
      setIsDropdownOpen(false);
    }
  };

  const handleReleaseStateChange = (newState: ReleaseStateOption) => {
    if (newState === "UNRELEASED") {
      navigateWithUpdates({
        releaseState: "UNRELEASED",
        status: "NOT_YET_RELEASED",
      });
    } else if (newState === "RELEASED") {
      navigateWithUpdates({
        releaseState: "RELEASED",
        status: query.status === "NOT_YET_RELEASED" ? undefined : query.status,
      });
    } else {
      navigateWithUpdates({
        releaseState: "ALL",
        status: query.status === "NOT_YET_RELEASED" ? undefined : query.status,
      });
    }
  };

  const selectedGenres = query.genre
    ? query.genre
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean)
    : [];

  const toggleGenre = (genreName: string) => {
    const next = selectedGenres.includes(genreName)
      ? selectedGenres.filter((g) => g !== genreName)
      : [...selectedGenres, genreName];
    navigateWithUpdates({
      genre: next.length > 0 ? next.join(",") : undefined,
    });
  };

  const activeLengthPreset =
    EPISODE_LENGTH_PRESETS.find(
      (p) => p.min === query.minEpisodes && p.max === query.maxEpisodes,
    )?.id || "any";

  const formats = routeType === "anime" ? ANIME_FORMATS : MANGA_FORMATS;
  const sortOptions = getSortOptions(routeType);

  const hasActiveFilters = Boolean(
    query.q ||
    query.format ||
    query.status ||
    query.season ||
    query.year ||
    query.genre ||
    query.minEpisodes ||
    query.maxEpisodes ||
    query.releaseState !== "RELEASED" ||
    query.sort !== "POPULARITY_DESC",
  );

  const resetAllFilters = () => {
    setSearchInput("");
    setIsDropdownOpen(false);
    router.push(pathname, { scroll: false });
  };

  return (
    <div className="flex flex-col gap-4 mb-6">
      {/* ROW 1: Predictive Search Input + Release State Segmented Switcher + Sort & Filter Trigger */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
        {/* SMART PREDICTIVE SEARCH BOX */}
        <div ref={searchContainerRef} className="relative flex-1">
          <form
            onSubmit={handleSearchSubmit}
            className="relative flex items-center"
          >
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 pointer-events-none" />
            <Input
              type="search"
              value={searchInput}
              onFocus={() => setIsDropdownOpen(true)}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setIsDropdownOpen(true);
              }}
              onKeyDown={handleKeyDown}
              placeholder={`Search ${routeType} by English, Romaji, or Native title...`}
              aria-label={`Search ${routeType}`}
              aria-expanded={isDropdownOpen && predictions.length > 0}
              aria-autocomplete="list"
              className="h-11 pl-10 pr-24 rounded-xl bg-card border-border text-sm font-medium shadow-sm focus-visible:ring-primary"
            />
            <div className="absolute right-1.5 flex items-center gap-1">
              {isPredicting && (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mr-1" />
              )}
              {searchInput && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => {
                    setSearchInput("");
                    setPredictions([]);
                    if (query.q) navigateWithUpdates({ q: undefined });
                  }}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <Button
                type="submit"
                size="sm"
                className="h-8 px-3 rounded-lg font-bold text-xs"
              >
                Search
              </Button>
            </div>
          </form>

          {/* PREDICTIVE DROPDOWN */}
          {isDropdownOpen && searchInput.trim().length >= 2 && (
            <div
              role="listbox"
              className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 rounded-2xl bg-popover border border-border shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
            >
              <div className="px-3.5 py-2 bg-muted/50 border-b border-border flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <span>
                  Predictive Matches ({query.releaseState.toLowerCase()})
                </span>
                <span>Press Enter for all results</span>
              </div>

              {isPredicting && predictions.length === 0 ? (
                <div className="p-6 flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  Searching catalog...
                </div>
              ) : predictions.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No instant matches found for &ldquo;{searchInput}&rdquo;.
                  Press{" "}
                  <kbd className="px-1.5 py-0.5 rounded bg-secondary text-foreground font-mono text-[10px]">
                    Enter
                  </kbd>{" "}
                  to run a deep search.
                </div>
              ) : (
                <ul className="divide-y divide-border max-h-[380px] overflow-y-auto">
                  {predictions.map((item, idx) => {
                    const itemTitle =
                      item.title?.english ||
                      item.title?.romaji ||
                      item.title?.native ||
                      "Unknown";
                    const subTitle =
                      item.title?.english &&
                      item.title?.romaji &&
                      item.title.english !== item.title.romaji
                        ? item.title.romaji
                        : item.title?.native;
                    const cover =
                      item.coverImage?.extraLarge ||
                      item.coverImage?.large ||
                      "/placeholder.jpg";
                    const isUnreleased = item.status === "NOT_YET_RELEASED";
                    const score = item.averageScore
                      ? (item.averageScore / 10).toFixed(1)
                      : null;

                    return (
                      <li key={item.id}>
                        <Link
                          href={`/${routeType}/${item.id}`}
                          onClick={() => setIsDropdownOpen(false)}
                          className={cn(
                            "flex items-center gap-3.5 p-2.5 transition-colors",
                            highlightedIndex === idx
                              ? "bg-accent text-accent-foreground"
                              : "hover:bg-accent/60",
                          )}
                        >
                          <div className="relative w-10 h-14 rounded-lg overflow-hidden bg-secondary shrink-0 border border-border">
                            {cover !== "/placeholder.jpg" && (
                              <Image
                                src={cover}
                                alt={itemTitle}
                                fill
                                sizes="40px"
                                className="object-cover"
                              />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                                {itemTitle}
                              </p>
                              {isUnreleased && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
                                  Unreleased
                                </span>
                              )}
                            </div>
                            {subTitle && (
                              <p className="text-[11px] text-muted-foreground truncate">
                                {subTitle}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1 text-[10px] font-bold uppercase text-muted-foreground">
                              {item.format && (
                                <span>{item.format.replace(/_/g, " ")}</span>
                              )}
                              {item.seasonYear && (
                                <>
                                  <span>•</span>
                                  <span>{item.seasonYear}</span>
                                </>
                              )}
                              {item.status && !isUnreleased && (
                                <>
                                  <span>•</span>
                                  <span
                                    className={
                                      item.status === "RELEASING"
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : ""
                                    }
                                  >
                                    {item.status.replace(/_/g, " ")}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {score && (
                            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-secondary text-xs font-bold text-foreground shrink-0">
                              <Star className="w-3 h-3 text-amber-400 fill-current" />
                              {score}
                            </div>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* RELEASE STATE SEGMENTED TOGGLE (Separates Released vs Unreleased Media) */}
        <div
          role="group"
          aria-label="Filter by release state"
          className="inline-flex p-1 rounded-xl bg-secondary border border-border shrink-0 self-start lg:self-auto"
        >
          <button
            type="button"
            onClick={() => handleReleaseStateChange("RELEASED")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
              query.releaseState === "RELEASED"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Released</span>
          </button>

          <button
            type="button"
            onClick={() => handleReleaseStateChange("UNRELEASED")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
              query.releaseState === "UNRELEASED"
                ? "bg-amber-500 text-neutral-950 shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <CalendarClock className="w-3.5 h-3.5" />
            <span>Unreleased</span>
          </button>

          <button
            type="button"
            onClick={() => handleReleaseStateChange("ALL")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
              query.releaseState === "ALL"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All</span>
          </button>
        </div>

        {/* SORT SELECTOR & ADVANCED FILTER DRAWER BUTTON */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative flex items-center flex-1 sm:flex-initial">
            <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground absolute left-3 pointer-events-none" />
            <select
              aria-label="Sort catalog results"
              value={query.sort}
              onChange={(e) =>
                navigateWithUpdates({
                  sort: e.target.value as CatalogSortOption,
                })
              }
              className="h-11 pl-8 pr-8 rounded-xl bg-card border border-border text-xs sm:text-sm font-bold text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer appearance-none w-full"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  Sort: {opt.label}
                </option>
              ))}
            </select>
          </div>

          <Button
            type="button"
            variant={showFilters ? "default" : "outline"}
            onClick={() => setShowFilters((prev) => !prev)}
            className="h-11 px-4 rounded-xl font-bold text-xs sm:text-sm gap-2 shrink-0"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filters</span>
            {selectedGenres.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-primary-foreground text-primary text-[10px] font-black">
                {selectedGenres.length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* ROW 2: Quick Format Pills (TV, Movie, OVA, Manga, etc.) */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
        <button
          type="button"
          onClick={() => navigateWithUpdates({ format: undefined })}
          className={cn(
            "px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all shrink-0 cursor-pointer",
            !query.format
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-foreground/30",
          )}
        >
          All Formats
        </button>

        {formats.map((fmt) => {
          const isSelected = query.format === fmt.value;
          return (
            <button
              key={fmt.value}
              type="button"
              onClick={() =>
                navigateWithUpdates({
                  format: isSelected ? undefined : fmt.value,
                })
              }
              className={cn(
                "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all shrink-0 cursor-pointer",
                isSelected
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-foreground/30",
              )}
            >
              {routeType === "anime" ? (
                <Tv className="w-3 h-3" />
              ) : (
                <BookOpen className="w-3 h-3" />
              )}
              <span>{fmt.label}</span>
            </button>
          );
        })}
      </div>

      {/* ROW 3: Expandable Advanced Filter Matrix (Status, Season, Year, Episodes/Chapters, Genres) */}
      {showFilters && (
        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-lg flex flex-col gap-5 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Release Status */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                Airing / Release Status
              </label>
              <select
                value={query.status || ""}
                onChange={(e) => {
                  const val = e.target.value || undefined;
                  navigateWithUpdates({
                    status: val as NormalizedCatalogQuery["status"],
                    releaseState:
                      val === "NOT_YET_RELEASED"
                        ? "UNRELEASED"
                        : query.releaseState === "UNRELEASED"
                          ? "RELEASED"
                          : query.releaseState,
                  });
                }}
                className="h-10 px-3 rounded-xl bg-background border border-border text-xs font-bold text-foreground"
              >
                <option value="">Any Status</option>
                <option value="RELEASING">
                  {routeType === "anime"
                    ? "Currently Airing"
                    : "Currently Publishing"}
                </option>
                <option value="FINISHED">Finished / Completed</option>
                <option value="NOT_YET_RELEASED">
                  Unreleased / Upcoming Only
                </option>
                <option value="HIATUS">On Hiatus</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            {/* Season */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                Broadcast Season
              </label>
              <select
                value={query.season || ""}
                onChange={(e) =>
                  navigateWithUpdates({
                    season: (e.target.value ||
                      undefined) as NormalizedCatalogQuery["season"],
                  })
                }
                className="h-10 px-3 rounded-xl bg-background border border-border text-xs font-bold text-foreground"
              >
                <option value="">All Seasons</option>
                <option value="CURRENT">Current Season</option>
                <option value="WINTER">Winter (Jan–Mar)</option>
                <option value="SPRING">Spring (Apr–Jun)</option>
                <option value="SUMMER">Summer (Jul–Sep)</option>
                <option value="FALL">Fall (Oct–Dec)</option>
              </select>
            </div>

            {/* Release Year */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                Release Year
              </label>
              <select
                value={query.year || ""}
                onChange={(e) =>
                  navigateWithUpdates({
                    year: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="h-10 px-3 rounded-xl bg-background border border-border text-xs font-bold text-foreground"
              >
                <option value="">Any Year</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Episode / Chapter Count Preset */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                {routeType === "anime" ? "Episode Count" : "Chapter Count"}
              </label>
              <select
                value={activeLengthPreset}
                onChange={(e) => {
                  const preset = EPISODE_LENGTH_PRESETS.find(
                    (p) => p.id === e.target.value,
                  );
                  navigateWithUpdates({
                    minEpisodes: preset?.min,
                    maxEpisodes: preset?.max,
                  });
                }}
                className="h-10 px-3 rounded-xl bg-background border border-border text-xs font-bold text-foreground"
              >
                {EPISODE_LENGTH_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Multi-Select Genres & Themes */}
          <div className="flex flex-col gap-2 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                Genres & Themes (Multi-select)
              </span>
              {selectedGenres.length > 0 && (
                <button
                  type="button"
                  onClick={() => navigateWithUpdates({ genre: undefined })}
                  className="text-xs font-bold text-primary hover:underline cursor-pointer"
                >
                  Clear Genres
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {CATALOG_GENRES.map((g) => {
                const isSelected = selectedGenres.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => toggleGenre(g)}
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-background text-muted-foreground border-border hover:text-foreground hover:border-foreground/30",
                    )}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ROW 4: Active Filter Chips + Total Result Counter */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-b border-border pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
            {totalItems.toLocaleString()}{" "}
            {totalItems === 1 ? "Title" : "Titles"}
          </span>

          {query.releaseState === "UNRELEASED" && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              Unreleased Only
              <button
                type="button"
                aria-label="Switch back to released media"
                onClick={() => handleReleaseStateChange("RELEASED")}
                className="hover:opacity-75"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {query.q && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/15 text-primary border border-primary/30">
              Query: &ldquo;{query.q}&rdquo;
              <button
                type="button"
                aria-label="Remove search query"
                onClick={() => navigateWithUpdates({ q: undefined })}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {query.format && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-secondary text-foreground border border-border">
              Format: {query.format.replace(/_/g, " ")}
              <button
                type="button"
                aria-label="Remove format filter"
                onClick={() => navigateWithUpdates({ format: undefined })}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {query.status && query.status !== "NOT_YET_RELEASED" && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-secondary text-foreground border border-border">
              Status: {query.status.replace(/_/g, " ")}
              <button
                type="button"
                aria-label="Remove status filter"
                onClick={() => navigateWithUpdates({ status: undefined })}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {query.season && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-secondary text-foreground border border-border">
              Season: {query.season}
              <button
                type="button"
                aria-label="Remove season filter"
                onClick={() => navigateWithUpdates({ season: undefined })}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {query.year && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-secondary text-foreground border border-border">
              Year: {query.year}
              <button
                type="button"
                aria-label="Remove year filter"
                onClick={() => navigateWithUpdates({ year: undefined })}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {selectedGenres.map((g) => (
            <span
              key={g}
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/25"
            >
              {g}
              <button
                type="button"
                aria-label={`Remove ${g} genre`}
                onClick={() => toggleGenre(g)}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetAllFilters}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset All
          </button>
        )}
      </div>
    </div>
  );
}
