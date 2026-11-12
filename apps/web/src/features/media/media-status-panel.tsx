// C:\Projects\animanga-platform\apps\web\src\features\media\media-status-panel.tsx
"use client";

import { useState, useEffect } from "react";
import { Plus, Play, CalendarClock } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MediaDetailDto } from "@/lib/api/types/media";

interface MediaStatusPanelProps {
  media: MediaDetailDto;
  nextAiring?: { airingAt: number; episode: number } | null;
}

export function MediaStatusPanel({ media, nextAiring }: MediaStatusPanelProps) {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const accentColor = media.colorHex || "var(--primary)";
  const resolvedNextAiring = nextAiring ?? media.airing?.nextEpisode ?? null;

  const formatEAT = (unixSecs: number) => {
    return new Intl.DateTimeFormat("en-KE", {
      timeZone: "Africa/Nairobi",
      weekday: "long",
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

  return (
    <div className="w-full bg-card/90 border border-border backdrop-blur-2xl rounded-2xl p-4 md:p-5 shadow-xl flex flex-col lg:flex-row items-center justify-between gap-5">
      {/* Left: Primary Actions */}
      <div className="flex items-center gap-3.5 w-full lg:w-auto">
        <Button className="flex-1 lg:flex-none bg-primary hover:bg-primary/90 text-primary-foreground h-11 md:h-12 px-7 rounded-xl font-bold text-sm md:text-base transition-transform hover:scale-[1.02] shadow-md">
          <Plus className="w-4 h-4 mr-2" /> Add to List
        </Button>

        {trailerUrl && (
          <a
            href={trailerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "flex-1 lg:flex-none bg-secondary/60 hover:bg-accent border-border text-foreground h-11 md:h-12 px-6 rounded-xl font-bold text-sm md:text-base transition-transform hover:scale-[1.02]",
            )}
          >
            <Play className="w-4 h-4 mr-2 fill-current text-primary" /> Watch
            Trailer
          </a>
        )}
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
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                Next:
              </span>
              <span className="text-xs sm:text-sm font-bold text-foreground">
                Episode {resolvedNextAiring.episode}
              </span>
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
        </div>
      )}
    </div>
  );
}
