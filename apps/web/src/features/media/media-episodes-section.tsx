// C:\Projects\animanga-platform\apps\web\src\features\media\media-episodes-section.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Star,
  Check,
  Search,
  Tv,
  BookOpen,
  CalendarClock,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/providers/auth-provider";
import {
  unwrapApiData,
  type LibraryEntryDto,
  type UserMediaStatus,
} from "@/lib/api/types/library";
import type { MediaDetailDto } from "@/lib/api/types/media";
import { cn } from "@/lib/utils";

interface MediaEpisodesSectionProps {
  media: MediaDetailDto;
  accentColor?: string;
}

interface EpisodeItem {
  number: number;
  title: string;
  airingAt: number | null;
  isUpcoming: boolean;
}

const CHUNK_SIZE = 24;

function parseEpisodeRatingsFromNotes(
  notes?: string | null,
): Record<number, number> {
  if (!notes) return {};
  try {
    const parsed = JSON.parse(notes) as {
      episodeRatings?: Record<string, number>;
    };
    if (parsed && typeof parsed.episodeRatings === "object") {
      const out: Record<number, number> = {};
      for (const [k, v] of Object.entries(parsed.episodeRatings)) {
        const epNum = Number(k);
        if (!Number.isNaN(epNum) && typeof v === "number") {
          out[epNum] = v;
        }
      }
      return out;
    }
  } catch {
    // Notes is plain text
  }
  return {};
}

export function MediaEpisodesSection({
  media,
  accentColor = "var(--primary)",
}: MediaEpisodesSectionProps) {
  const { isAuthenticated, setLocalLibraryItem, requireAuth } = useAuth();
  const [userProgress, setUserProgress] = useState(0);
  const [userStatus, setUserStatus] = useState<UserMediaStatus | null>(null);
  const [episodeRatings, setEpisodeRatings] = useState<Record<number, number>>(
    {},
  );
  const [activeRatingEp, setActiveRatingEp] = useState<number | null>(null);
  const [savingEp, setSavingEp] = useState<number | null>(null);
  const [selectedChunkIdx, setSelectedChunkIdx] = useState(0);
  const [episodeSearch, setEpisodeSearch] = useState("");

  const isManga = media.type === "MANGA";
  const unitSingular = isManga ? "Chapter" : "Episode";
  const unitPlural = isManga ? "Chapters" : "Episodes";
  const unitShort = isManga ? "CH" : "EP";
  const mediaTitle = media.title?.english || media.title?.romaji || "Unknown";

  // Determine total episodes/chapters cleanly (even for ongoing long-running series)
  const totalCount = useMemo(() => {
    const rawTotal = isManga ? media.chapters : media.episodes;
    if (rawTotal && rawTotal > 0) return Math.min(rawTotal, 2000);
    if (media.airing?.nextEpisode?.episode) {
      return Math.min(media.airing.nextEpisode.episode + 3, 2000);
    }
    if (media.status === "NOT_YET_RELEASED") return 1;
    return 12;
  }, [isManga, media.chapters, media.episodes, media.airing, media.status]);

  // Build episode list with titles and EAT airing metadata
  const allEpisodes = useMemo<EpisodeItem[]>(() => {
    const upcomingMap = new Map<number, number>();
    if (media.airing?.nextEpisode) {
      upcomingMap.set(
        media.airing.nextEpisode.episode,
        media.airing.nextEpisode.airingAt,
      );
    }
    for (const up of media.airing?.upcomingEpisodes || []) {
      upcomingMap.set(up.episode, up.airingAt);
    }

    const nextEpNum = media.airing?.nextEpisode?.episode ?? null;
    const list: EpisodeItem[] = [];

    for (let i = 1; i <= totalCount; i++) {
      const airingAt = upcomingMap.get(i) ?? null;
      const isUpcoming =
        media.status === "NOT_YET_RELEASED" ||
        (nextEpNum !== null && i >= nextEpNum);

      let epTitle = `${unitSingular} ${i}`;
      if (i === 1) {
        epTitle =
          media.format === "MOVIE"
            ? `${mediaTitle} (Full Feature)`
            : `${unitSingular} 1 — Premiere`;
      } else if (
        i === totalCount &&
        media.status === "FINISHED" &&
        totalCount > 1
      ) {
        epTitle = `${unitSingular} ${i} — Finale`;
      } else if (nextEpNum !== null && i === nextEpNum) {
        epTitle = `${unitSingular} ${i} — Next Broadcast`;
      } else if (nextEpNum !== null && i === nextEpNum - 1) {
        epTitle = `${unitSingular} ${i} — Latest Release`;
      }

      list.push({
        number: i,
        title: epTitle,
        airingAt,
        isUpcoming,
      });
    }
    return list;
  }, [
    totalCount,
    media.airing,
    media.status,
    media.format,
    mediaTitle,
    unitSingular,
  ]);

  // Hydrate user progress and saved episode ratings from /api/v1/library/:id
  useEffect(() => {
    let active = true;
    if (!isAuthenticated) {
      setUserProgress(0);
      setUserStatus(null);
      setEpisodeRatings({});
      return;
    }

    const loadEntry = async () => {
      try {
        const res = await fetch(`/api/v1/library/${media.id}`, {
          credentials: "include",
        });
        if (!res.ok) return;
        const json = await res.json();
        const entry = unwrapApiData<LibraryEntryDto>(json);
        if (active && entry) {
          setUserProgress(entry.progress || 0);
          setUserStatus(entry.status);
          setEpisodeRatings(parseEpisodeRatingsFromNotes(entry.notes));
        }
      } catch {
        // Ignore network error
      }
    };

    void loadEntry();
    return () => {
      active = false;
    };
  }, [media.id, isAuthenticated]);

  // Chunk ranges for effortless browsing of long series (e.g., 1-24, 25-48, ...)
  const chunks = useMemo(() => {
    const out: Array<{ label: string; start: number; end: number }> = [];
    for (let i = 0; i < allEpisodes.length; i += CHUNK_SIZE) {
      const start = i + 1;
      const end = Math.min(i + CHUNK_SIZE, allEpisodes.length);
      out.push({ label: `${start}–${end}`, start, end });
    }
    return out;
  }, [allEpisodes.length]);

  const visibleEpisodes = useMemo(() => {
    const trimmed = episodeSearch.trim().toLowerCase();
    if (trimmed) {
      return allEpisodes.filter(
        (ep) =>
          String(ep.number) === trimmed ||
          String(ep.number).includes(trimmed) ||
          ep.title.toLowerCase().includes(trimmed),
      );
    }
    const chunk = chunks[selectedChunkIdx] || chunks[0];
    if (!chunk) return allEpisodes;
    return allEpisodes.slice(chunk.start - 1, chunk.end);
  }, [allEpisodes, chunks, selectedChunkIdx, episodeSearch]);

  const persistEpisodeState = async (
    epNumber: number,
    nextRatings: Record<number, number>,
    nextProgress: number,
  ) => {
    setSavingEp(epNumber);
    const ratedValues = Object.values(nextRatings);
    const meanScore =
      ratedValues.length > 0
        ? Number(
            (
              ratedValues.reduce((acc, v) => acc + v, 0) / ratedValues.length
            ).toFixed(1),
          )
        : undefined;

    const nextStatus: UserMediaStatus =
      nextProgress >= totalCount && media.status === "FINISHED"
        ? "COMPLETED"
        : userStatus || "CURRENT";

    setUserProgress(nextProgress);
    setUserStatus(nextStatus);
    setEpisodeRatings(nextRatings);
    setLocalLibraryItem(media.id, {
      status: nextStatus,
      progress: nextProgress,
      ...(meanScore !== undefined ? { score: meanScore } : {}),
    });

    try {
      const res = await fetch(`/api/v1/library/${media.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          status: nextStatus,
          progress: nextProgress,
          ...(meanScore !== undefined ? { score: meanScore } : {}),
          notes: JSON.stringify({ episodeRatings: nextRatings }),
        }),
      });

      if (res.ok) {
        window.dispatchEvent(
          new CustomEvent("animanga:library-updated", {
            detail: {
              mediaId: media.id,
              progress: nextProgress,
              score: meanScore,
              status: nextStatus,
            },
          }),
        );
      }
    } finally {
      setSavingEp(null);
      setActiveRatingEp(null);
    }
  };

  const handleRateEpisode = (epNumber: number, scoreValue: number) => {
    if (!requireAuth("rate", `${mediaTitle} — ${unitSingular} ${epNumber}`)) {
      return;
    }
    const nextRatings = { ...episodeRatings, [epNumber]: scoreValue };
    const nextProgress = Math.max(userProgress, epNumber);
    void persistEpisodeState(epNumber, nextRatings, nextProgress);
  };

  const handleToggleWatched = (epNumber: number) => {
    if (
      !requireAuth("progress", `${mediaTitle} — ${unitSingular} ${epNumber}`)
    ) {
      return;
    }
    const nextProgress = userProgress === epNumber ? epNumber - 1 : epNumber;
    void persistEpisodeState(epNumber, episodeRatings, nextProgress);
  };

  const formatEATShort = (unixSecs: number) => {
    return new Intl.DateTimeFormat("en-KE", {
      timeZone: "Africa/Nairobi",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(unixSecs * 1000));
  };

  const ratedEpisodesCount = Object.keys(episodeRatings).length;

  return (
    <section id="episodes" className="flex flex-col gap-4 w-full min-w-0">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className="w-2 h-7 rounded-sm shrink-0"
            style={{ backgroundColor: accentColor }}
          />
          <h3 className="text-xl md:text-2xl font-black tracking-tight uppercase text-foreground flex items-center gap-2">
            <span>{unitPlural} &amp; Ratings</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-secondary text-muted-foreground border border-border">
              {totalCount}
            </span>
          </h3>
        </div>

        {/* Quick Jump / Search Episode Input */}
        <div className="flex items-center gap-2">
          {ratedEpisodesCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-warning/15 border border-warning/30 text-warning text-xs font-bold">
              <Sparkles className="w-3 h-3" />
              {ratedEpisodesCount} Rated
            </span>
          )}
          <div className="relative w-full sm:w-52">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type="search"
              value={episodeSearch}
              onChange={(e) => setEpisodeSearch(e.target.value)}
              placeholder={`Jump to ${unitSingular.toLowerCase()} #...`}
              aria-label={`Search ${unitPlural.toLowerCase()}`}
              className="h-9 pl-8 pr-3 rounded-xl bg-card border-border text-xs"
            />
          </div>
        </div>
      </div>

      {/* Range Chunk Switcher Pills for Series with > 24 Episodes */}
      {chunks.length > 1 && !episodeSearch.trim() && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 w-full max-w-full">
          {chunks.map((chunk, idx) => (
            <button
              key={chunk.label}
              type="button"
              onClick={() => setSelectedChunkIdx(idx)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-black border shrink-0 transition-all cursor-pointer tabular-nums",
                selectedChunkIdx === idx
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-card text-muted-foreground border-border hover:text-foreground",
              )}
            >
              {unitShort} {chunk.label}
            </button>
          ))}
        </div>
      )}

      {/* Smooth-Scrolling Episode Grid Container */}
      <div className="max-h-[440px] overflow-y-auto pr-1 rounded-2xl border border-border bg-card/50 p-3 grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {visibleEpisodes.map((ep) => {
          const isWatched = isAuthenticated && userProgress >= ep.number;
          const myEpScore = isAuthenticated ? episodeRatings[ep.number] : null;
          const isRatingOpen = activeRatingEp === ep.number;
          const isSavingThis = savingEp === ep.number;

          return (
            <div
              key={ep.number}
              className={cn(
                "p-3 rounded-xl border transition-all flex flex-col gap-2.5",
                isWatched
                  ? "bg-primary/5 border-primary/30"
                  : "bg-card border-border hover:border-primary/40",
              )}
            >
              <div className="flex items-center justify-between gap-2.5">
                {/* Left: Episode Badge + Name */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => handleToggleWatched(ep.number)}
                    title={
                      isWatched
                        ? `Watched ${unitSingular} ${ep.number}`
                        : `Mark ${unitSingular} ${ep.number} watched`
                    }
                    className={cn(
                      "px-2.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider shrink-0 inline-flex items-center gap-1 border transition-colors cursor-pointer tabular-nums",
                      isWatched
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary text-foreground border-border hover:border-primary/50",
                    )}
                  >
                    {isWatched ? (
                      <Check className="w-3 h-3" />
                    ) : isManga ? (
                      <BookOpen className="w-3 h-3 text-primary" />
                    ) : (
                      <Tv className="w-3 h-3 text-primary" />
                    )}
                    <span>
                      {unitShort} {String(ep.number).padStart(2, "0")}
                    </span>
                  </button>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                      {ep.title}
                    </p>
                    {ep.airingAt ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-success">
                        <CalendarClock className="w-3 h-3" />
                        Airs {formatEATShort(ep.airingAt)} EAT
                      </span>
                    ) : ep.isUpcoming ? (
                      <span className="text-[10px] font-bold uppercase text-warning">
                        Upcoming Release
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        {isWatched ? "Completed" : "Available"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Rate Episode Button */}
                <button
                  type="button"
                  disabled={isSavingThis}
                  onClick={() => {
                    if (
                      !requireAuth(
                        "rate",
                        `${mediaTitle} — ${unitSingular} ${ep.number}`,
                      )
                    ) {
                      return;
                    }
                    setActiveRatingEp(isRatingOpen ? null : ep.number);
                  }}
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg text-xs font-bold border inline-flex items-center gap-1 shrink-0 transition-all cursor-pointer",
                    myEpScore
                      ? "bg-warning/15 border-warning/40 text-warning"
                      : "bg-secondary/70 border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {isSavingThis ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Star
                      className={cn(
                        "w-3.5 h-3.5",
                        myEpScore
                          ? "text-warning fill-current"
                          : "text-warning",
                      )}
                    />
                  )}
                  <span>{myEpScore ? `${myEpScore}/10` : "Rate"}</span>
                </button>
              </div>

              {/* Inline 1–10 Star Rating Picker */}
              {isRatingOpen && (
                <div className="pt-2 border-t border-border flex items-center justify-between gap-1 overflow-x-auto no-scrollbar animate-in fade-in duration-150">
                  <span className="text-[10px] font-black uppercase text-muted-foreground shrink-0 mr-1">
                    Score:
                  </span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleRateEpisode(ep.number, val)}
                        className={cn(
                          "size-6 rounded-md text-[11px] font-black transition-all cursor-pointer tabular-nums",
                          myEpScore === val
                            ? "bg-warning text-warning-foreground scale-110 shadow-xs"
                            : "bg-secondary hover:bg-primary hover:text-primary-foreground text-foreground",
                        )}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
