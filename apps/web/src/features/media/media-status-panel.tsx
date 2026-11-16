// C:\Projects\animanga-platform\apps\web\src\features\media\media-status-panel.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Check,
  Play,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Share2,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MediaDetailDto } from "@/lib/api/types/media";

interface MediaStatusPanelProps {
  media: MediaDetailDto;
  nextAiring?: { airingAt: number; episode: number } | null;
}

const LIST_STATUSES = [
  { id: "PLANNING", animeLabel: "Plan to Watch", mangaLabel: "Plan to Read" },
  { id: "CURRENT", animeLabel: "Watching", mangaLabel: "Reading" },
  { id: "COMPLETED", animeLabel: "Completed", mangaLabel: "Completed" },
  { id: "PAUSED", animeLabel: "On Hold", mangaLabel: "On Hold" },
] as const;

export function MediaStatusPanel({ media, nextAiring }: MediaStatusPanelProps) {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [listStatus, setListStatus] = useState<string | null>(null);
  const [showListMenu, setShowListMenu] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [copied, setCopied] = useState(false);

  const accentColor = media.colorHex || "var(--primary)";
  const resolvedNextAiring = nextAiring ?? media.airing?.nextEpisode ?? null;
  const upcomingSchedule = media.airing?.upcomingEpisodes || [];

  // Hydrate saved user list state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`animanga:list:${media.id}`);
      if (saved) setListStatus(saved);
    } catch {
      // Ignore storage access errors
    }
  }, [media.id]);

  const handleSelectListStatus = (statusId: string | null) => {
    setListStatus(statusId);
    setShowListMenu(false);
    try {
      if (statusId) {
        localStorage.setItem(`animanga:list:${media.id}`, statusId);
      } else {
        localStorage.removeItem(`animanga:list:${media.id}`);
      }
    } catch {
      // Ignore storage access errors
    }
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
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Button
              type="button"
              onClick={() => setShowListMenu((prev) => !prev)}
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground h-11 md:h-12 px-6 rounded-xl font-bold text-sm md:text-base shadow-md gap-2 cursor-pointer"
            >
              {listStatus ? (
                <Check className="w-4 h-4" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span>{currentListLabel}</span>
              <ChevronDown className="w-4 h-4 opacity-80" />
            </Button>

            {showListMenu && (
              <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-48 rounded-xl bg-popover border border-border shadow-xl p-1.5 flex flex-col gap-1 animate-in fade-in slide-in-from-top-1 duration-150">
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

          {trailerUrl && (
            <a
              href={trailerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "flex-1 sm:flex-initial bg-secondary/60 hover:bg-accent border-border text-foreground h-11 md:h-12 px-5 rounded-xl font-bold text-sm md:text-base",
              )}
            >
              <Play className="w-4 h-4 mr-2 fill-current text-primary" /> Watch
              Trailer
            </a>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={() => void handleShare()}
            className="h-11 md:h-12 px-4 rounded-xl font-bold text-xs sm:text-sm bg-secondary/40 hover:bg-accent border-border gap-2 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-500" />
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
