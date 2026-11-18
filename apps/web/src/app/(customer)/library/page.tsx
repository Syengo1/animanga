// C:\Projects\animanga-platform\apps\web\src\app\(customer)\library\page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Bookmark,
  Heart,
  Tv,
  BookOpen,
  Search,
  Plus,
  Trash2,
  Star,
  LayoutGrid,
  List,
  Loader2,
  Compass,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  unwrapApiData,
  type UserLibraryResponseDto,
  type LibraryEntryDto,
  type UserMediaStatus,
} from "@/lib/api/types/library";
import { cn } from "@/lib/utils";

type MediaFilterTab = "ALL" | "ANIME" | "MANGA" | "FAVORITES";
type StatusFilterTab = "ALL" | UserMediaStatus;

const STATUS_LABELS: Record<UserMediaStatus, string> = {
  CURRENT: "Watching / Reading",
  PLANNING: "Planned",
  COMPLETED: "Completed",
  PAUSED: "On Hold",
  DROPPED: "Dropped",
};

function LibraryManagerContent() {
  const searchParams = useSearchParams();
  const initialTabParam = searchParams.get("tab");

  const [library, setLibrary] = useState<UserLibraryResponseDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mediaTab, setMediaTab] = useState<MediaFilterTab>(
    initialTabParam === "FAVORITES" ? "FAVORITES" : "ALL",
  );
  const [statusTab, setStatusTab] = useState<StatusFilterTab>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"UPDATED" | "SCORE" | "TITLE">(
    "UPDATED",
  );
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (initialTabParam === "FAVORITES") {
      setMediaTab("FAVORITES");
    }
  }, [initialTabParam]);

  const fetchLibrary = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/library", { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        const data = unwrapApiData<UserLibraryResponseDto>(json);
        if (data) setLibrary(data);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLibrary();
  }, [fetchLibrary]);

  const handleUpdateEntry = async (
    mediaId: string,
    updates: {
      status?: UserMediaStatus | null;
      isFavorite?: boolean;
      progress?: number;
      score?: number | null;
    },
  ) => {
    setBusyId(mediaId);
    try {
      const res = await fetch(`/api/v1/library/${mediaId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        await fetchLibrary();
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleRemoveEntry = async (mediaId: string) => {
    setBusyId(mediaId);
    try {
      const res = await fetch(`/api/v1/library/${mediaId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        try {
          localStorage.removeItem(`animanga:list:${mediaId}`);
          localStorage.removeItem(`animanga:fav:${mediaId}`);
        } catch {
          // Ignore
        }
        await fetchLibrary();
      }
    } finally {
      setBusyId(null);
    }
  };

  const filteredEntries = useMemo(() => {
    const raw = library?.entries || [];
    return raw
      .filter((entry) => {
        if (mediaTab === "FAVORITES" && !entry.isFavorite) return false;
        if (mediaTab === "ANIME" && entry.mediaType !== "ANIME") return false;
        if (mediaTab === "MANGA" && entry.mediaType !== "MANGA") return false;
        if (statusTab !== "ALL" && entry.status !== statusTab) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const tEng = entry.media.title.english?.toLowerCase() || "";
          const tRom = entry.media.title.romaji?.toLowerCase() || "";
          const tNat = entry.media.title.native?.toLowerCase() || "";
          if (!tEng.includes(q) && !tRom.includes(q) && !tNat.includes(q)) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "SCORE") {
          return (b.score || 0) - (a.score || 0);
        }
        if (sortBy === "TITLE") {
          const titleA =
            a.media.title.english || a.media.title.romaji || "Unknown";
          const titleB =
            b.media.title.english || b.media.title.romaji || "Unknown";
          return titleA.localeCompare(titleB);
        }
        return (
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      });
  }, [library?.entries, mediaTab, statusTab, searchQuery, sortBy]);

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-xs font-bold uppercase tracking-wider">
          Loading your library &amp; favorites...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight uppercase text-foreground flex items-center gap-2.5">
            <Bookmark className="w-7 h-7 text-primary" />
            <span>My Library &amp; Favorites</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-1">
            Manage your bookmarked anime, manga reading progress, personal
            ratings, and top favorites.
          </p>
        </div>

        {/* Media Type Switcher */}
        <div className="inline-flex p-1 rounded-xl bg-secondary border border-border self-start sm:self-auto">
          {(
            [
              { id: "ALL", label: "All", icon: Bookmark },
              { id: "ANIME", label: "Anime", icon: Tv },
              { id: "MANGA", label: "Manga", icon: BookOpen },
              { id: "FAVORITES", label: "Favorites", icon: Heart },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setMediaTab(id)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                mediaTab === id
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 md:pb-0">
          {(
            [
              "ALL",
              "CURRENT",
              "PLANNING",
              "COMPLETED",
              "PAUSED",
              "DROPPED",
            ] as const
          ).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusTab(st)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold border shrink-0 transition-all cursor-pointer",
                statusTab === st
                  ? "bg-card text-primary border-primary shadow-xs"
                  : "bg-secondary/60 text-muted-foreground border-border hover:text-foreground",
              )}
            >
              {st === "ALL" ? "All Statuses" : STATUS_LABELS[st]}
            </button>
          ))}
        </div>

        {/* Search + Sort + Grid/Table Toggle */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter library..."
              className="h-9 pl-8 pr-3 rounded-xl bg-card border-border text-xs"
            />
          </div>

          <select
            aria-label="Sort library"
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as "UPDATED" | "SCORE" | "TITLE")
            }
            className="h-9 px-3 rounded-xl bg-card border border-border text-xs font-bold text-foreground cursor-pointer"
          >
            <option value="UPDATED">Sort: Recent</option>
            <option value="SCORE">Sort: My Score</option>
            <option value="TITLE">Sort: Title A–Z</option>
          </select>

          <div className="hidden sm:flex items-center p-1 rounded-xl bg-secondary border border-border">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              aria-label="Grid view"
              className={cn(
                "p-1.5 rounded-lg cursor-pointer",
                viewMode === "grid"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground",
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              aria-label="Table view"
              className={cn(
                "p-1.5 rounded-lg cursor-pointer",
                viewMode === "table"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground",
              )}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Library Entries */}
      {filteredEntries.length === 0 ? (
        <div className="py-20 px-4 rounded-2xl border border-dashed border-border bg-card/50 text-center flex flex-col items-center gap-3">
          <p className="text-base font-black text-foreground">
            No titles found in this view
          </p>
          <p className="text-xs text-muted-foreground max-w-md">
            Explore the Anime or Manga catalog and click the Bookmark or
            Favorite button on any title to build your personal collection.
          </p>
          <div className="flex items-center gap-3 mt-1">
            <Link
              href="/search/anime"
              className={cn(
                buttonVariants({ variant: "default" }),
                "h-9 px-4 rounded-xl text-xs font-bold gap-1.5",
              )}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Explore Anime</span>
            </Link>
            <Link
              href="/search/manga"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-9 px-4 rounded-xl text-xs font-bold bg-card",
              )}
            >
              Explore Manga
            </Link>
          </div>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEntries.map((entry) => {
            const title =
              entry.media.title.english ||
              entry.media.title.romaji ||
              "Unknown";
            const cover =
              entry.media.coverImage.extraLarge ||
              entry.media.coverImage.large ||
              "/placeholder.jpg";
            const routeType = entry.mediaType === "MANGA" ? "manga" : "anime";
            const unit = entry.mediaType === "MANGA" ? "Ch" : "Ep";
            const isBusy = busyId === entry.mediaId;

            return (
              <div
                key={entry.id}
                className="p-4 rounded-2xl bg-card border border-border shadow-xs flex gap-4 hover:border-primary/40 transition-all"
              >
                <Link
                  href={`/${routeType}/${entry.mediaId}`}
                  className="relative w-20 h-28 rounded-xl overflow-hidden bg-secondary shrink-0 border border-border"
                >
                  {cover !== "/placeholder.jpg" && (
                    <Image
                      src={cover}
                      alt={title}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  )}
                </Link>

                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] font-black uppercase tracking-wider text-primary">
                        {entry.mediaType} •{" "}
                        {entry.media.format?.replace(/_/g, " ") || "Series"}
                      </span>
                      <Link
                        href={`/${routeType}/${entry.mediaId}`}
                        className="block text-sm font-black text-foreground hover:text-primary transition-colors truncate"
                      >
                        {title}
                      </Link>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          void handleUpdateEntry(entry.mediaId, {
                            isFavorite: !entry.isFavorite,
                          })
                        }
                        title={
                          entry.isFavorite
                            ? "Remove from favorites"
                            : "Add to favorites"
                        }
                        className={cn(
                          "p-1.5 rounded-lg border transition-colors cursor-pointer",
                          entry.isFavorite
                            ? "bg-destructive/15 border-destructive/30 text-destructive"
                            : "bg-secondary/60 border-border text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <Heart
                          className={cn(
                            "w-3.5 h-3.5",
                            entry.isFavorite && "fill-current",
                          )}
                        />
                      </button>

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleRemoveEntry(entry.mediaId)}
                        title="Remove from library"
                        className="p-1.5 rounded-lg bg-secondary/60 border border-border text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Interactive Controls Row */}
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <select
                      aria-label="List status"
                      disabled={isBusy}
                      value={entry.status || ""}
                      onChange={(e) =>
                        void handleUpdateEntry(entry.mediaId, {
                          status: (e.target.value ||
                            null) as UserMediaStatus | null,
                        })
                      }
                      className="h-8 px-2.5 rounded-lg bg-secondary border border-border text-xs font-bold text-foreground cursor-pointer"
                    >
                      <option value="">No Status</option>
                      <option value="CURRENT">
                        {entry.mediaType === "MANGA" ? "Reading" : "Watching"}
                      </option>
                      <option value="PLANNING">Planned</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="PAUSED">On Hold</option>
                      <option value="DROPPED">Dropped</option>
                    </select>

                    {/* Progress Counter */}
                    <div className="flex items-center gap-1.5 px-2.5 h-8 rounded-lg bg-secondary border border-border text-xs font-bold">
                      <span className="tabular-nums">
                        {unit} {entry.progress}
                        {entry.maxUnits ? `/${entry.maxUnits}` : ""}
                      </span>
                      {(!entry.maxUnits || entry.progress < entry.maxUnits) && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() =>
                            void handleUpdateEntry(entry.mediaId, {
                              progress: entry.progress + 1,
                              status:
                                entry.maxUnits &&
                                entry.progress + 1 >= entry.maxUnits
                                  ? "COMPLETED"
                                  : entry.status || "CURRENT",
                            })
                          }
                          className="px-1.5 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-black cursor-pointer"
                        >
                          +1
                        </button>
                      )}
                    </div>

                    {/* Score Selector */}
                    <div className="relative flex items-center">
                      <Star className="w-3 h-3 text-warning fill-current absolute left-2 pointer-events-none" />
                      <select
                        aria-label="Score"
                        disabled={isBusy}
                        value={entry.score ?? ""}
                        onChange={(e) =>
                          void handleUpdateEntry(entry.mediaId, {
                            score: e.target.value
                              ? Number(e.target.value)
                              : null,
                          })
                        }
                        className="h-8 pl-6 pr-2 rounded-lg bg-secondary border border-border text-xs font-bold text-foreground cursor-pointer"
                      >
                        <option value="">—</option>
                        {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Compact Tracker Table View */
        <div className="rounded-2xl bg-card border border-border overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-secondary/60 text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Progress</th>
                  <th className="py-3 px-3">Score</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                {filteredEntries.map((entry) => {
                  const title =
                    entry.media.title.english ||
                    entry.media.title.romaji ||
                    "Unknown";
                  const routeType =
                    entry.mediaType === "MANGA" ? "manga" : "anime";
                  const unit = entry.mediaType === "MANGA" ? "Ch" : "Ep";

                  return (
                    <tr
                      key={entry.id}
                      className="hover:bg-accent/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-bold text-foreground">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/${routeType}/${entry.mediaId}`}
                            className="hover:text-primary transition-colors line-clamp-1"
                          >
                            {title}
                          </Link>
                          {entry.isFavorite && (
                            <Heart className="w-3.5 h-3.5 text-destructive fill-current shrink-0" />
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-1 rounded-md bg-secondary text-[11px] font-bold">
                          {entry.status ? STATUS_LABELS[entry.status] : "—"}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold tabular-nums">
                        <div className="flex items-center gap-1.5">
                          <span>
                            {unit} {entry.progress}
                            {entry.maxUnits ? ` / ${entry.maxUnits}` : ""}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              void handleUpdateEntry(entry.mediaId, {
                                progress: entry.progress + 1,
                              })
                            }
                            className="px-1.5 py-0.5 rounded bg-primary/15 text-primary hover:bg-primary hover:text-primary-foreground text-[10px] font-black cursor-pointer"
                          >
                            <Plus className="w-2.5 h-2.5 inline" />1
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-bold text-warning">
                        {entry.score ? `${entry.score} ★` : "—"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => void handleRemoveEntry(entry.mediaId)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UserLibraryPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <LibraryManagerContent />
    </Suspense>
  );
}
