"use client";

import { useState, useEffect } from "react";
import { Plus, Play, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MediaStatusPanelProps {
  media: any;
  nextAiring?: { airingAt: number; episode: number } | null;
  schedule?: any[];
}

export function MediaStatusPanel({
  media,
  nextAiring,
  schedule,
}: MediaStatusPanelProps) {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const accentColor = media.colorHex || "var(--primary)";

  // Format timestamp explicitly to EAT (East Africa Time) for the local audience
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
    if (!nextAiring) return;

    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const diff = nextAiring.airingAt - now;

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
    }, 1000);

    return () => clearInterval(interval);
  }, [nextAiring]);

  return (
    <div className="w-full bg-white/5 border border-white/10 backdrop-blur-2xl rounded-2xl p-4 md:p-6 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-6">
      {/* Left: Actions */}
      <div className="flex items-center gap-4 w-full lg:w-auto">
        <Button className="flex-1 lg:flex-none bg-white hover:bg-white/90 text-black h-12 md:h-14 px-8 md:px-10 rounded-xl font-bold text-base transition-transform hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
          <Plus className="w-5 h-5 mr-2" /> Add to List
        </Button>
        {media.trailer && (
          <Button
            variant="outline"
            className="flex-1 lg:flex-none bg-black/40 hover:bg-white/10 border-white/20 text-white h-12 md:h-14 px-6 md:px-8 rounded-xl font-bold transition-transform hover:scale-105"
          >
            <Play className="w-5 h-5 mr-2 fill-current" /> Trailer
          </Button>
        )}
      </div>

      {/* Right: Live Airing Status */}
      {nextAiring && (
        <div className="flex items-center gap-4 md:gap-6 bg-black/40 p-4 rounded-xl border border-white/5 w-full lg:w-auto">
          <div
            className="flex items-center justify-center w-12 h-12 rounded-full bg-white/5 border border-white/10 shrink-0"
            style={{ color: accentColor }}
          >
            <CalendarClock className="w-6 h-6" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-black uppercase tracking-widest text-white/50">
                Next:
              </span>
              <span className="text-sm font-bold text-white">
                Episode {nextAiring.episode}
              </span>
            </div>
            <div className="text-xs md:text-sm text-white/80 font-medium truncate">
              {formatEAT(nextAiring.airingAt)}
            </div>
          </div>
          <div className="pl-4 md:pl-6 ml-auto border-l border-white/10 flex flex-col items-end shrink-0">
            <span
              className="text-[10px] uppercase tracking-widest font-bold mb-1"
              style={{ color: accentColor }}
            >
              T-Minus
            </span>
            <span className="text-sm md:text-base font-black tabular-nums tracking-tight text-white">
              {timeLeft || "Calculating..."}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
