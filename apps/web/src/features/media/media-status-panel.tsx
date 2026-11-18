// C:\Projects\animanga-platform\apps\web\src\features\media\media-status-panel.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
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
  X,
  Download,
  Copy,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const { isAuthenticated, setLocalLibraryItem, requireAuth } = useAuth();
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [listStatus, setListStatus] = useState<UserMediaStatus | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [progress, setProgress] = useState(0);
  const [userScore, setUserScore] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [showListMenu, setShowListMenu] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showTrailerModal, setShowTrailerModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedDetails, setCopiedDetails] = useState(false);
  const [isGeneratingCard, setIsGeneratingCard] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const title =
    media.title?.english ||
    media.title?.romaji ||
    media.title?.native ||
    "Unknown";
  const accentColor = media.colorHex || "var(--primary)";
  const resolvedNextAiring = nextAiring ?? media.airing?.nextEpisode ?? null;
  const upcomingSchedule = media.airing?.upcomingEpisodes || [];
  const maxUnits = media.type === "MANGA" ? media.chapters : media.episodes;
  const unitLabel = media.type === "MANGA" ? "Ch" : "Ep";
  const posterUrl =
    media.coverImage?.extraLarge ||
    media.coverImage?.large ||
    media.bannerImage ||
    "/placeholder.jpg";

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowListMenu(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // Close trailer or share modal on Escape
  useEffect(() => {
    if (!showTrailerModal && !showShareModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowTrailerModal(false);
        setShowShareModal(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showTrailerModal, showShareModal]);

  // Hydrate strictly from cloud library when authenticated
  useEffect(() => {
    let active = true;
    if (!isAuthenticated) {
      setListStatus(null);
      setIsFavorite(false);
      setProgress(0);
      setUserScore(null);
      return;
    }

    const loadState = async () => {
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
          }
        }
      } catch {
        // Ignore network error
      }
    };

    void loadState();
    return () => {
      active = false;
    };
  }, [media.id, isAuthenticated]);

  // Listen for episode rating/progress updates emitted from MediaEpisodesSection
  useEffect(() => {
    const handleExternalSync = (e: Event) => {
      const custom = e as CustomEvent<{
        mediaId: string;
        progress?: number;
        score?: number | null;
        status?: UserMediaStatus | null;
      }>;
      if (custom.detail?.mediaId === media.id) {
        if (custom.detail.progress !== undefined)
          setProgress(custom.detail.progress);
        if (custom.detail.score !== undefined)
          setUserScore(custom.detail.score);
        if (custom.detail.status !== undefined)
          setListStatus(custom.detail.status);
      }
    };
    window.addEventListener("animanga:library-updated", handleExternalSync);
    return () =>
      window.removeEventListener(
        "animanga:library-updated",
        handleExternalSync,
      );
  }, [media.id]);

  const persistUpdate = async (updates: {
    status?: UserMediaStatus | null;
    isFavorite?: boolean;
    progress?: number;
    score?: number | null;
  }) => {
    if (!isAuthenticated) return;

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
    setLocalLibraryItem(media.id, {
      status: nextStatus,
      isFavorite: nextFav,
      progress: nextProgress,
      score: nextScore,
    });

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
          setLocalLibraryItem(media.id, {
            status: saved.status,
            isFavorite: saved.isFavorite,
            progress: saved.progress,
            score: saved.score,
          });
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenListMenu = () => {
    if (!requireAuth("bookmark", title)) return;
    setShowListMenu((prev) => !prev);
  };

  const handleToggleFavorite = () => {
    if (!requireAuth("favorite", title)) return;
    void persistUpdate({ isFavorite: !isFavorite });
  };

  const handleSelectListStatus = (statusId: UserMediaStatus | null) => {
    setShowListMenu(false);
    const autoProgress =
      statusId === "COMPLETED" && maxUnits ? maxUnits : progress;
    void persistUpdate({ status: statusId, progress: autoProgress });
  };

  const handleIncrementProgress = () => {
    if (!requireAuth("progress", title)) return;
    const nextVal = maxUnits ? Math.min(maxUnits, progress + 1) : progress + 1;
    const nextStatus =
      maxUnits && nextVal >= maxUnits ? "COMPLETED" : listStatus || "CURRENT";
    void persistUpdate({ progress: nextVal, status: nextStatus });
  };

  // Build formatted text summary for sharing
  const getFormattedShareText = () => {
    const scoreStr = media.averageScore
      ? `★ ${(media.averageScore / 10).toFixed(1)}/10`
      : "";
    const fmtStr = media.format?.replace(/_/g, " ") || media.type;
    const unitStr =
      media.type === "ANIME"
        ? media.episodes
          ? `${media.episodes} Episodes`
          : "Ongoing"
        : media.chapters
          ? `${media.chapters} Chapters`
          : "Ongoing";
    const genreStr =
      media.genres && media.genres.length > 0
        ? media.genres.slice(0, 4).join(", ")
        : "";
    const synopsisSnippet = media.description?.text
      ? media.description.text.slice(0, 150).trim() + "..."
      : "";

    return [
      `${title}${scoreStr ? ` (${scoreStr})` : ""}`,
      `${fmtStr} • ${unitStr}${genreStr ? ` • ${genreStr}` : ""}`,
      synopsisSnippet,
    ]
      .filter(Boolean)
      .join("\n");
  };

  // Generates a branded PNG share card with the anime artwork and metadata
  const generateShareCardBlob = async (): Promise<Blob | null> => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 900;
      canvas.height = 500;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      // Background Twilight Gradient
      const grad = ctx.createLinearGradient(0, 0, 900, 500);
      grad.addColorStop(0, "#111926");
      grad.addColorStop(1, "#182334");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 900, 500);

      // Accent top bar
      ctx.fillStyle = media.colorHex || "#548ccf";
      ctx.fillRect(0, 0, 900, 10);

      // Draw Poster Image if CORS allows
      let drewPoster = false;
      if (posterUrl && posterUrl !== "/placeholder.jpg") {
        try {
          const img = new window.Image();
          img.crossOrigin = "anonymous";
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error("Image load failed"));
            img.src = posterUrl;
          });
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(40, 45, 275, 410, 18);
          ctx.clip();
          ctx.drawImage(img, 40, 45, 275, 410);
          ctx.restore();
          drewPoster = true;
        } catch {
          drewPoster = false;
        }
      }

      const textX = drewPoster ? 350 : 50;
      const maxTextW = drewPoster ? 510 : 800;

      // Brand header
      ctx.fillStyle = "#548ccf";
      ctx.font = "bold 18px system-ui, sans-serif";
      ctx.fillText("ANIMANGA PLATFORM • OFFICIAL CATALOG", textX, 75);

      // Title
      ctx.fillStyle = "#e6eef8";
      ctx.font = "900 34px system-ui, sans-serif";
      const words = title.split(" ");
      let line = "";
      let y = 125;
      for (const word of words) {
        const test = line + word + " ";
        if (ctx.measureText(test).width > maxTextW && line) {
          ctx.fillText(line.trim(), textX, y);
          line = word + " ";
          y += 42;
          if (y > 210) break;
        } else {
          line = test;
        }
      }
      if (line) {
        ctx.fillText(line.trim(), textX, y);
        y += 40;
      }

      // Metadata badges
      const scoreStr = media.averageScore
        ? `★ ${(media.averageScore / 10).toFixed(1)} / 10`
        : "NEW";
      const fmtStr = media.format?.replace(/_/g, " ") || media.type;
      const countStr =
        media.type === "ANIME"
          ? media.episodes
            ? `${media.episodes} EPS`
            : "AIRING"
          : media.chapters
            ? `${media.chapters} CH`
            : "PUBLISHING";
      ctx.fillStyle = "#e5a93c";
      ctx.font = "bold 20px system-ui, sans-serif";
      ctx.fillText(
        `${scoreStr}   •   ${fmtStr}   •   ${countStr}`,
        textX,
        y + 10,
      );
      y += 45;

      // Genres
      if (media.genres?.length) {
        ctx.fillStyle = "#94aac4";
        ctx.font = "bold 16px system-ui, sans-serif";
        ctx.fillText(media.genres.slice(0, 4).join("  •  "), textX, y);
        y += 38;
      }

      // Synopsis snippet
      const cleanSynopsis = (media.description?.text || "").slice(0, 220);
      ctx.fillStyle = "#cbd5e1";
      ctx.font = "16px system-ui, sans-serif";
      const synWords = cleanSynopsis.split(" ");
      let synLine = "";
      for (const w of synWords) {
        const test = synLine + w + " ";
        if (ctx.measureText(test).width > maxTextW && synLine) {
          ctx.fillText(synLine.trim(), textX, y);
          synLine = w + " ";
          y += 24;
          if (y > 430) break;
        } else {
          synLine = test;
        }
      }
      if (synLine && y <= 430) {
        ctx.fillText(synLine.trim() + "...", textX, y);
      }

      // Footer URL
      ctx.fillStyle = "#548ccf";
      ctx.font = "bold 15px system-ui, sans-serif";
      ctx.fillText("animangaweb.vercel.app", textX, 465);

      return await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/png"),
      );
    } catch {
      return null;
    }
  };

  const handleNativeShareWithImage = async () => {
    setIsGeneratingCard(true);
    const shareUrl = window.location.href;
    const shareText = getFormattedShareText();

    try {
      const blob = await generateShareCardBlob();
      if (blob && typeof navigator !== "undefined" && navigator.share) {
        const file = new File([blob], `${media.slug || "animanga"}-card.png`, {
          type: "image/png",
        });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `${title} | Animanga`,
            text: `${shareText}\n\n${shareUrl}`,
            files: [file],
          });
          return;
        }
        await navigator.share({
          title: `${title} | Animanga`,
          text: shareText,
          url: shareUrl,
        });
        return;
      }
    } catch {
      // User cancelled or browser unsupported; fallback to copy
    } finally {
      setIsGeneratingCard(false);
    }
  };

  const handleDownloadShareCard = async () => {
    setIsGeneratingCard(true);
    try {
      const blob = await generateShareCardBlob();
      if (!blob) return;
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = `${media.slug || "animanga"}-share-card.png`;
      a.click();
      URL.revokeObjectURL(objUrl);
    } finally {
      setIsGeneratingCard(false);
    }
  };

  const handleCopyRichDetails = async () => {
    try {
      const fullPayload = `${getFormattedShareText()}\n\nExplore on Animanga: ${window.location.href}`;
      await navigator.clipboard.writeText(fullPayload);
      setCopiedDetails(true);
      setTimeout(() => setCopiedDetails(false), 2500);
    } catch {
      // Ignore
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

  const youtubeTrailerId =
    media.trailer?.site?.toLowerCase() === "youtube" && media.trailer.id
      ? media.trailer.id
      : null;

  const activeListObj = LIST_STATUSES.find((s) => s.id === listStatus);
  const currentListLabel = activeListObj
    ? media.type === "MANGA"
      ? activeListObj.mangaLabel
      : activeListObj.animeLabel
    : "Add to List";

  return (
    <>
      <div className="w-full bg-card/90 border border-border backdrop-blur-2xl rounded-2xl p-4 md:p-5 shadow-xl flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Left: Primary Actions */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full lg:w-auto">
            {/* Status Dropdown Button (Auth-Gated) */}
            <div ref={menuRef} className="relative flex-1 sm:flex-initial">
              <Button
                type="button"
                onClick={handleOpenListMenu}
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

              {showListMenu && isAuthenticated && (
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

            {/* Favorite Heart Button (Auth-Gated) */}
            <Button
              type="button"
              variant="outline"
              aria-label={
                isFavorite ? "Remove from favorites" : "Add to favorites"
              }
              onClick={handleToggleFavorite}
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

            {/* Inline Progress Tracker & +1 Incrementor */}
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

            {/* Personal Rating Selector (Auth-Gated) */}
            {isAuthenticated ? (
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
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => requireAuth("rate", title)}
                className="h-11 md:h-12 px-3.5 rounded-xl font-bold text-xs bg-secondary/60 hover:bg-accent border-border gap-1.5 cursor-pointer"
              >
                <Star className="w-3.5 h-3.5 text-warning fill-current" />
                <span>Rate ★</span>
              </Button>
            )}

            {/* On-Site Trailer Modal Trigger (No External YouTube Redirect) */}
            {youtubeTrailerId && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowTrailerModal(true)}
                className="bg-secondary/60 hover:bg-accent border-border text-foreground h-11 md:h-12 px-4 rounded-xl font-bold text-xs sm:text-sm gap-1.5 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current text-primary" />
                <span>Watch Trailer</span>
              </Button>
            )}

            {/* Rich Image & Details Share Button */}
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowShareModal(true)}
              className="h-11 md:h-12 px-3.5 rounded-xl font-bold text-xs sm:text-sm bg-secondary/40 hover:bg-accent border-border gap-1.5 cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-primary" />
              <span className="hidden sm:inline">Share</span>
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

      {/* =====================================================================
          ON-SITE CINEMA TRAILER MODAL (Plays video directly on Animanga)
          ===================================================================== */}
      {showTrailerModal && youtubeTrailerId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${title} Official Trailer`}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-cinema/85 backdrop-blur-xl animate-in fade-in duration-150"
          onClick={() => setShowTrailerModal(false)}
        >
          <div
            className="relative w-full max-w-4xl rounded-3xl bg-card border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-secondary/50">
              <div className="flex items-center gap-2 min-w-0">
                <Play className="w-4 h-4 text-primary fill-current shrink-0" />
                <p className="text-xs sm:text-sm font-black uppercase tracking-wider text-foreground truncate">
                  {title} — Official Trailer
                </p>
              </div>
              <button
                type="button"
                aria-label="Close trailer"
                onClick={() => setShowTrailerModal(false)}
                className="p-1.5 rounded-full bg-card border border-border text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="relative aspect-video w-full bg-cinema">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${youtubeTrailerId}?autoplay=1&rel=0&modestbranding=1`}
                title={`${title} Official Trailer`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          RICH ANIME IMAGE & DETAILS SHARE MODAL
          ===================================================================== */}
      {showShareModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Share ${title}`}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-cinema/80 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setShowShareModal(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-3xl bg-card border border-border p-5 sm:p-6 shadow-2xl flex flex-col gap-5 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-primary" />
                <h3 className="text-base sm:text-lg font-black uppercase tracking-tight text-foreground">
                  Share Title &amp; Artwork
                </h3>
              </div>
              <button
                type="button"
                aria-label="Close share dialog"
                onClick={() => setShowShareModal(false)}
                className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Visual Share Card Preview (Poster Image + Details) */}
            <div className="flex gap-4 p-3.5 rounded-2xl bg-secondary/70 border border-border">
              <div className="relative w-20 sm:w-24 aspect-[2/3] rounded-xl overflow-hidden bg-muted shrink-0 border border-border shadow-md">
                {posterUrl !== "/placeholder.jpg" && (
                  <Image
                    src={posterUrl}
                    alt={title}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    {media.averageScore && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-warning/15 text-warning text-[10px] font-black">
                        <Star className="w-2.5 h-2.5 fill-current" />
                        {(media.averageScore / 10).toFixed(1)}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded bg-card text-[10px] font-black uppercase text-primary">
                      {media.format?.replace(/_/g, " ") || media.type}
                    </span>
                  </div>
                  <p className="text-sm sm:text-base font-black text-foreground line-clamp-1">
                    {title}
                  </p>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                    {media.description?.text ||
                      `Explore ${title} episodes, cast, and release schedule on Animanga.`}
                  </p>
                </div>

                {media.genres?.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-2">
                    {media.genres.slice(0, 3).map((g) => (
                      <span
                        key={g}
                        className="px-2 py-0.5 rounded-full bg-card border border-border text-[10px] font-bold text-muted-foreground"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Primary Actions: Native Share with Image + Download Share Card + Copy Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <Button
                type="button"
                disabled={isGeneratingCard}
                onClick={() => void handleNativeShareWithImage()}
                className="h-11 rounded-xl font-bold text-xs gap-2 cursor-pointer shadow-sm"
              >
                {isGeneratingCard ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>Share Image &amp; Details</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                disabled={isGeneratingCard}
                onClick={() => void handleDownloadShareCard()}
                className="h-11 rounded-xl font-bold text-xs gap-2 bg-secondary/50 hover:bg-accent border-border cursor-pointer"
              >
                <Download className="w-4 h-4 text-primary" />
                <span>Download Poster Card</span>
              </Button>
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleCopyRichDetails()}
                className="flex-1 h-10 rounded-xl font-bold text-xs gap-2 bg-card hover:bg-accent border-border cursor-pointer"
              >
                {copiedDetails ? (
                  <>
                    <Check className="w-4 h-4 text-success" />
                    <span>Copied Summary &amp; Link!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-primary" />
                    <span>Copy Details &amp; Link</span>
                  </>
                )}
              </Button>

              <a
                href={`https://wa.me/?text=${encodeURIComponent(`${getFormattedShareText()}\n\n${typeof window !== "undefined" ? window.location.href : ""}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 h-10 rounded-xl bg-success/15 hover:bg-success/25 text-success border border-success/30 text-xs font-black inline-flex items-center justify-center transition-colors"
              >
                WhatsApp
              </a>

              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(getFormattedShareText())}&url=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 h-10 rounded-xl bg-secondary hover:bg-accent text-foreground border border-border text-xs font-black inline-flex items-center justify-center transition-colors"
              >
                X / Post
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
