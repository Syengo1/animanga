// C:\Projects\animanga-platform\apps\web\src\features\media\media-status-panel.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import {
  Plus,
  Check,
  Play,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Share2,
  Heart,
  Star,
  Loader2,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";
import {
  unwrapApiData,
  type LibraryEntryDto,
  type UserMediaStatus,
} from "@/lib/api/types/library";
import { cn } from "@/lib/utils";
import type { MediaDetailDto } from "@/lib/api/types/media";

interface MediaStatusPanelProps {
  media: MediaDetailDto;
  nextAiring?: { airingAt: number; episode: number } | null;
}

const LIST_STATUSES: Array<{
  id: UserMediaStatus;
  animeLabel: string;
  mangaLabel: string;
}> = [
  { id: "CURRENT", animeLabel: "Watching", mangaLabel: "Reading" },
  { id: "PLANNING", animeLabel: "Plan to Watch", mangaLabel: "Plan to Read" },
  { id: "COMPLETED", animeLabel: "Completed", mangaLabel: "Completed" },
  { id: "PAUSED", animeLabel: "On Hold", mangaLabel: "On Hold" },
  { id: "DROPPED", animeLabel: "Dropped", mangaLabel: "Dropped" },
];

export function MediaStatusPanel({ media, nextAiring }: MediaStatusPanelProps) {
  const { isAuthenticated } = useAuth();
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [listStatus, setListStatus] = useState<UserMediaStatus | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [progress, setProgress] = useState(0);
  const [userScore, setUserScore] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [showListMenu, setShowListMenu] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const accentColor = media.colorHex || "var(--primary)";
  const resolvedNextAiring = nextAiring ?? media.airing?.nextEpisode ?? null;
  const upcomingSchedule = media.airing?.upcomingEpisodes || [];
  const maxUnits = media.type === "MANGA" ? media.chapters : media.episodes;
  const unitLabel = media.type === "MANGA" ? "Ch" : "Ep";

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowListMenu(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // Hydrate from cloud library if authenticated, or localStorage if guest
  useEffect(() => {
    let active = true;

    const loadState = async () => {
      if (isAuthenticated) {
        try {
          const res = await fetch(`/api/v1/library/${media.id}`, {
            credentials: "include",
          });
          if (res.ok) {
            const json = await res.json();
            const entry = unwrapApiData<LibraryEntryDto>(json);
            if (active && entry) {
              setListStatus(entry.status);
              setIsFavorite(Boolean(entry.isFavorite));
              setProgress(entry.progress || 0);
              setUserScore(entry.score);
              return;
            }
          }
        } catch {
          // Fallback to localStorage below
        }
      }

      try {
        const savedStatus = localStorage.getItem(`animanga:list:${media.id}`);
        const savedFav = localStorage.getItem(`animanga:fav:${media.id}`);
        if (active) {
          if (savedStatus) setListStatus(savedStatus as UserMediaStatus);
          if (savedFav === "true") setIsFavorite(true);
        }
      } catch {
        // Ignore storage errors
      }
    };

    void loadState();
    return () => {
      active = false;
    };
  }, [media.id, isAuthenticated]);

  const persistUpdate = async (updates: {
    status?: UserMediaStatus | null;
    isFavorite?: boolean;
    progress?: number;
    score?: number | null;
  }) => {
    const nextStatus =
      updates.status !== undefined ? updates.status : listStatus;
    const nextFav =
      updates.isFavorite !== undefined ? updates.isFavorite : isFavorite;
    const nextProgress =
      updates.progress !== undefined ? updates.progress : progress;
    const nextScore = updates.score !== undefined ? updates.score : userScore;

    setListStatus(nextStatus);
    setIsFavorite(nextFav);
    setProgress(nextProgress);
    setUserScore(nextScore);

    try {
      if (nextStatus) {
        localStorage.setItem(`animanga:list:${media.id}`, nextStatus);
      } else {
        localStorage.removeItem(`animanga:list:${media.id}`);
      }
      if (nextFav) {
        localStorage.setItem(`animanga:fav:${media.id}`, "true");
      } else {
        localStorage.removeItem(`animanga:fav:${media.id}`);
      }
    } catch {
      // Ignore storage errors
    }

    if (!isAuthenticated) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/v1/library/${media.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          status: nextStatus,
          isFavorite: nextFav,
          progress: nextProgress,
          score: nextScore,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const saved = unwrapApiData<LibraryEntryDto>(json);
        if (saved) {
          setListStatus(saved.status);
          setIsFavorite(saved.isFavorite);
          setProgress(saved.progress);
          setUserScore(saved.score);
        }
      }
    } catch {
      // Ignore network hiccup; localStorage already updated
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectListStatus = (statusId: UserMediaStatus | null) => {
    setShowListMenu(false);
    const autoProgress =
      statusId === "COMPLETED" && maxUnits ? maxUnits : progress;
    void persistUpdate({ status: statusId, progress: autoProgress });
  };

  const handleIncrementProgress = () => {
    const nextVal = maxUnits ? Math.min(maxUnits, progress + 1) : progress + 1;
    const nextStatus =
      maxUnits && nextVal >= maxUnits ? "COMPLETED" : listStatus || "CURRENT";
    void persistUpdate({ progress: nextVal, status: nextStatus });
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard failure
    }
  };

  const formatEAT = (unixSecs: number) => {
    return new Intl.DateTimeFormat("en-KE", {
      timeZone: "Africa/Nairobi",
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(new Date(unixSecs * 1000));
  };

  useEffect(() => {
    if (!resolvedNextAiring) return;

    const updateCountdown = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = resolvedNextAiring.airingAt - now;
      if (diff <= 0) {
        setTimeLeft("Airing Now");
        return;
      }
      const days = Math.floor(diff / 86400);
      const hours = Math.floor((diff % 86400) / 3600);
      const mins = Math.floor((diff % 3600) / 60);

      const parts = [];
      if (days > 0) parts.push(`${days}d`);
      if (hours > 0 || days > 0) parts.push(`${hours}h`);
      parts.push(`${mins}m`);

      setTimeLeft(parts.join(" "));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 30000);
    return () => clearInterval(interval);
  }, [resolvedNextAiring]);

  const trailerUrl =
    media.trailer?.site?.toLowerCase() === "youtube" && media.trailer.id
      ? `https://www.youtube.com/watch?v=${media.trailer.id}`
      : null;

  const activeListObj = LIST_STATUSES.find((s) => s.id === listStatus);
  const currentListLabel = activeListObj
    ? media.type === "MANGA"
      ? activeListObj.mangaLabel
      : activeListObj.animeLabel
    : "Add to List";

  return (
    <div className="w-full bg-card/90 border border-border backdrop-blur-2xl rounded-2xl p-4 md:p-5 shadow-xl flex flex-col gap-4">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Left: Primary Actions */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full lg:w-auto">
          {/* Status Dropdown Button */}
          <div ref={menuRef} className="relative flex-1 sm:flex-initial">
            <Button
              type="button"
              onClick={() => setShowListMenu((prev) => !prev)}
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground h-11 md:h-12 px-5 rounded-xl font-bold text-sm md:text-base shadow-md gap-2 cursor-pointer"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : listStatus ? (
                <Check className="w-4 h-4" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span>{currentListLabel}</span>
              <ChevronDown className="w-4 h-4 opacity-80" />
            </Button>

            {showListMenu && (
              <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-52 rounded-xl bg-popover border border-border shadow-xl p-1.5 flex flex-col gap-1 animate-in fade-in slide-in-from-top-1 duration-150">
                {LIST_STATUSES.map((st) => {
                  const label =
                    media.type === "MANGA" ? st.mangaLabel : st.animeLabel;
                  const isSelected = listStatus === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => handleSelectListStatus(st.id)}
                      className={cn(
                        "flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-colors text-left cursor-pointer",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-accent text-foreground",
                      )}
                    >
                      <span>{label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </button>
                  );
                })}
                {listStatus && (
                  <button
                    type="button"
                    onClick={() => handleSelectListStatus(null)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-destructive hover:bg-destructive/10 text-left border-t border-border mt-1 pt-2 cursor-pointer"
                  >
                    Remove from List
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Favorite Heart Button */}
          <Button
            type="button"
            variant="outline"
            aria-label={
              isFavorite ? "Remove from favorites" : "Add to favorites"
            }
            onClick={() => void persistUpdate({ isFavorite: !isFavorite })}
            className={cn(
              "h-11 md:h-12 px-4 rounded-xl font-bold text-xs sm:text-sm gap-2 border cursor-pointer transition-all",
              isFavorite
                ? "bg-destructive/15 border-destructive/40 text-destructive hover:bg-destructive/20"
                : "bg-secondary/50 border-border text-foreground hover:bg-accent",
            )}
          >
            <Heart className={cn("w-4 h-4", isFavorite && "fill-current")} />
            <span className="hidden sm:inline">
              {isFavorite ? "Favorited" : "Favorite"}
            </span>
          </Button>

          {/* Inline Progress Tracker & +1 Incrementor (Visible when in list or favorited) */}
          {(listStatus || progress > 0) && (
            <div className="flex items-center gap-1.5 px-3 h-11 md:h-12 rounded-xl bg-secondary/70 border border-border">
              <span className="text-xs font-black text-foreground tabular-nums">
                {unitLabel} {progress}
                {maxUnits ? ` / ${maxUnits}` : ""}
              </span>
              {(!maxUnits || progress < maxUnits) && (
                <button
                  type="button"
                  onClick={handleIncrementProgress}
                  title={`Increment ${unitLabel}`}
                  className="ml-1 px-2 py-1 rounded-lg bg-primary/15 hover:bg-primary text-primary hover:text-primary-foreground text-[11px] font-black transition-colors cursor-pointer"
                >
                  +1
                </button>
              )}
            </div>
          )}

          {/* Personal Rating Selector */}
          {(listStatus || isFavorite) && (
            <div className="relative flex items-center">
              <Star className="w-3.5 h-3.5 text-warning fill-current absolute left-3 pointer-events-none" />
              <select
                aria-label="Your score"
                value={userScore ?? ""}
                onChange={(e) =>
                  void persistUpdate({
                    score: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className="h-11 md:h-12 pl-8 pr-3 rounded-xl bg-secondary/70 border border-border text-xs font-bold text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Rate ★</option>
                {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((s) => (
                  <option key={s} value={s}>
                    {s} / 10 ★
                  </option>
                ))}
              </select>
            </div>
          )}

          {trailerUrl && (
            <a
              href={trailerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "bg-secondary/60 hover:bg-accent border-border text-foreground h-11 md:h-12 px-4 rounded-xl font-bold text-xs sm:text-sm",
              )}
            >
              <Play className="w-4 h-4 mr-1.5 fill-current text-primary" />{" "}
              Trailer
            </a>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={() => void handleShare()}
            className="h-11 md:h-12 px-3.5 rounded-xl font-bold text-xs sm:text-sm bg-secondary/40 hover:bg-accent border-border gap-1.5 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-success" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">Share</span>
              </>
            )}
          </Button>
        </div>

        {/* Right: Live EAT Airing Countdown */}
        {resolvedNextAiring && (
          <div className="flex items-center gap-4 md:gap-5 bg-secondary/60 p-3.5 rounded-xl border border-border w-full lg:w-auto">
            <div
              className="flex items-center justify-center w-11 h-11 rounded-full bg-card border border-border shrink-0"
              style={{ color: accentColor }}
            >
              <CalendarClock className="w-5 h-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                  Next:
                </span>
                <span className="text-xs sm:text-sm font-bold text-foreground">
                  Episode {resolvedNextAiring.episode}
                </span>
                {media.airing?.cadence &&
                  media.airing.cadence !== "UNKNOWN" && (
                    <span className="px-1.5 py-0.2 rounded bg-card border border-border text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                      {media.airing.cadence}
                    </span>
                  )}
              </div>
              <div className="text-xs text-muted-foreground font-medium truncate">
                {formatEAT(resolvedNextAiring.airingAt)}
              </div>
            </div>
            <div className="pl-4 md:pl-5 ml-auto border-l border-border flex flex-col items-end shrink-0">
              <span
                className="text-[10px] uppercase tracking-widest font-bold mb-0.5"
                style={{ color: accentColor }}
              >
                T-Minus
              </span>
              <span className="text-sm md:text-base font-black tabular-nums tracking-tight text-foreground">
                {timeLeft || "Calculating..."}
              </span>
            </div>

            {upcomingSchedule.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Toggle upcoming episode schedule"
                onClick={() => setShowSchedule((prev) => !prev)}
                className="h-8 w-8 rounded-lg shrink-0 cursor-pointer"
              >
                {showSchedule ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Expandable Upcoming Episodes Schedule Drawer */}
      {showSchedule && upcomingSchedule.length > 1 && (
        <div className="pt-3 border-t border-border grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 animate-in fade-in duration-150">
          {upcomingSchedule.slice(0, 8).map((ep) => (
            <div
              key={ep.episode}
              className="px-3 py-2 rounded-xl bg-secondary/40 border border-border flex items-center justify-between text-xs"
            >
              <span className="font-black text-foreground">
                Episode {ep.episode}
              </span>
              <span className="text-muted-foreground font-medium">
                {formatEAT(ep.airingAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
