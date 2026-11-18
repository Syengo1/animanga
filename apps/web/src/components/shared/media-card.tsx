// C:\Projects\animanga-platform\apps\web\src\components\shared\media-card.tsx
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, Tv, BookOpen, Bookmark, Check, Heart } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";

export interface MediaCardData {
  id: string;
  providerId: string;
  provider: string;
  title: {
    english: string | null;
    romaji: string | null;
    native: string | null;
  };
  synopsis?: string | null;
  genres?: string[];
  coverImage: {
    extraLarge: string | null;
    large: string | null;
    color: string | null;
  };
  bannerImage?: string | null;
  colorHex?: string | null;
  status: string | null;
  format?: string | null;
  episodes?: number | null;
  chapters?: number | null;
  volumes?: number | null;
  season?: string | null;
  seasonYear?: number | null;
  averageScore: number | null;
  popularity?: number | null;
}

const MANGA_FORMAT_SET = new Set(["MANGA", "NOVEL", "ONE_SHOT"]);

interface MediaCardProps {
  media: MediaCardData;
  type?: "anime" | "manga";
  mediaType?: "anime" | "manga";
  priority?: boolean;
  badgeText?: string | null;
  accentOverride?: string;
  className?: string;
}

export function MediaCard({
  media,
  type,
  mediaType,
  priority = false,
  badgeText,
  accentOverride,
  className,
}: MediaCardProps) {
  const { isAuthenticated } = useAuth();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  const inferredType: "anime" | "manga" =
    media.format && MANGA_FORMAT_SET.has(media.format.toUpperCase())
      ? "manga"
      : "anime";
  const activeType = mediaType || type || inferredType;

  useEffect(() => {
    try {
      const savedStatus = localStorage.getItem(`animanga:list:${media.id}`);
      const savedFav = localStorage.getItem(`animanga:fav:${media.id}`);
      if (savedStatus) setIsBookmarked(true);
      if (savedFav === "true") setIsFavorite(true);
    } catch {
      // Ignore storage error
    }
  }, [media.id]);

  const handleQuickBookmark = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const nextBookmarked = !isBookmarked;
    setIsBookmarked(nextBookmarked);

    try {
      if (nextBookmarked) {
        localStorage.setItem(`animanga:list:${media.id}`, "PLANNING");
      } else {
        localStorage.removeItem(`animanga:list:${media.id}`);
      }
    } catch {
      // Ignore
    }

    if (isAuthenticated) {
      try {
        await fetch(`/api/v1/library/${media.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            status: nextBookmarked ? "PLANNING" : null,
          }),
        });
      } catch {
        // Ignore network error
      }
    }
  };

  const handleQuickFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const nextFav = !isFavorite;
    setIsFavorite(nextFav);

    try {
      if (nextFav) {
        localStorage.setItem(`animanga:fav:${media.id}`, "true");
      } else {
        localStorage.removeItem(`animanga:fav:${media.id}`);
      }
    } catch {
      // Ignore
    }

    if (isAuthenticated) {
      try {
        await fetch(`/api/v1/library/${media.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ isFavorite: nextFav }),
        });
      } catch {
        // Ignore network error
      }
    }
  };

  const title =
    media.title?.english ||
    media.title?.romaji ||
    media.title?.native ||
    "Unknown";
  const coverUrl =
    media.coverImage?.extraLarge ||
    media.coverImage?.large ||
    "/placeholder.jpg";
  const accentColor =
    accentOverride ||
    media.colorHex ||
    media.coverImage?.color ||
    "var(--primary)";

  const formattedScore = media.averageScore
    ? (media.averageScore / 10).toFixed(1)
    : null;

  const subMeta =
    activeType === "anime"
      ? media.episodes
        ? `${media.episodes} EPS`
        : media.format?.replace(/_/g, " ")
      : media.chapters
        ? `${media.chapters} CH`
        : media.volumes
          ? `${media.volumes} VOL`
          : media.format?.replace(/_/g, " ");

  return (
    <Link
      href={`/${activeType}/${media.id}`}
      prefetch={false}
      className={cn(
        "flex flex-col gap-2 group cursor-pointer w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl",
        className,
      )}
    >
      <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-secondary border border-border shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:border-primary/50 group-hover:shadow-xl">
        {coverUrl !== "/placeholder.jpg" ? (
          <Image
            src={coverUrl}
            alt={title}
            fill
            priority={priority}
            sizes="(max-width: 640px) 150px, (max-width: 1024px) 190px, 220px"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground text-xs font-bold p-4 text-center">
            {title}
          </div>
        )}

        {/* Top Badges: Score + Format */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1 z-10 pointer-events-none">
          {formattedScore ? (
            <div className="bg-cinema/85 backdrop-blur-md px-2 py-0.5 rounded-md flex items-center gap-1 text-[11px] font-bold text-cinema-foreground border border-cinema-foreground/15 shadow-sm">
              <Star className="w-3 h-3 text-warning fill-current" />
              <span>{formattedScore}</span>
            </div>
          ) : (
            <span />
          )}

          {media.format && (
            <div className="bg-cinema/80 backdrop-blur-md px-1.5 py-0.5 rounded-md flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-cinema-foreground/90 border border-cinema-foreground/10 group-hover:opacity-0 transition-opacity">
              {activeType === "anime" ? (
                <Tv className="w-2.5 h-2.5 text-primary" />
              ) : (
                <BookOpen className="w-2.5 h-2.5 text-primary" />
              )}
              <span>{String(media.format).replace(/_/g, " ")}</span>
            </div>
          )}
        </div>

        {/* Hover Quick-Action Buttons: Bookmark & Favorite */}
        <div
          className={cn(
            "absolute top-2 right-2 z-20 flex items-center gap-1 transition-all duration-200",
            isBookmarked || isFavorite
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100",
          )}
        >
          <button
            type="button"
            onClick={(e) => void handleQuickFavorite(e)}
            aria-label={
              isFavorite ? "Remove from favorites" : "Add to favorites"
            }
            title={isFavorite ? "Favorited" : "Add to Favorites"}
            className={cn(
              "size-7 rounded-lg backdrop-blur-md flex items-center justify-center border transition-transform hover:scale-110 cursor-pointer",
              isFavorite
                ? "bg-destructive text-destructive-foreground border-destructive shadow-md"
                : "bg-cinema/85 text-cinema-foreground border-cinema-foreground/20 hover:bg-cinema",
            )}
          >
            <Heart
              className={cn("w-3.5 h-3.5", isFavorite && "fill-current")}
            />
          </button>

          <button
            type="button"
            onClick={(e) => void handleQuickBookmark(e)}
            aria-label={isBookmarked ? "Remove from list" : "Add to list"}
            title={isBookmarked ? "Saved in My List" : "Quick Save to List"}
            className={cn(
              "size-7 rounded-lg backdrop-blur-md flex items-center justify-center border transition-transform hover:scale-110 cursor-pointer",
              isBookmarked
                ? "bg-primary text-primary-foreground border-primary shadow-md"
                : "bg-cinema/85 text-cinema-foreground border-cinema-foreground/20 hover:bg-cinema",
            )}
          >
            {isBookmarked ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Bookmark className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Optional Relation / Context Badge */}
        {badgeText && (
          <div className="absolute bottom-2.5 left-2 right-2 z-10 pointer-events-none group-hover:opacity-0 transition-opacity duration-200">
            <span
              className="inline-block px-2 py-0.5 rounded-md bg-cinema/85 backdrop-blur-md text-[9px] font-black uppercase tracking-widest border border-cinema-foreground/15 text-cinema-foreground truncate max-w-full"
              style={{ borderLeftColor: accentColor, borderLeftWidth: "3px" }}
            >
              {badgeText}
            </span>
          </div>
        )}

        {/* Bottom Scrim & Status Pill on Hover */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-cinema/95 via-cinema/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        {media.status && (
          <div className="absolute bottom-2 left-2 right-2 px-2 py-1 rounded-md bg-cinema/90 backdrop-blur-md text-[10px] font-extrabold text-center text-cinema-foreground border border-cinema-foreground/15 opacity-0 translate-y-1.5 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 z-10 uppercase tracking-wider flex items-center justify-center gap-1.5">
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full shrink-0",
                media.status === "RELEASING" && "animate-pulse",
              )}
              style={{
                backgroundColor:
                  media.status === "RELEASING" ? "var(--success)" : accentColor,
              }}
            />
            <span className="truncate">
              {String(media.status).replace(/_/g, " ")}
            </span>
          </div>
        )}

        {/* Bottom Accent Bar */}
        <div
          className="absolute bottom-0 inset-x-0 h-1 opacity-85 transition-opacity group-hover:opacity-100"
          style={{ backgroundColor: accentColor }}
        />
      </div>

      <div className="flex flex-col gap-0.5 px-0.5">
        <h4 className="text-xs sm:text-sm font-bold leading-snug line-clamp-2 text-foreground group-hover:text-primary transition-colors">
          {title}
        </h4>
        {(subMeta || media.seasonYear) && (
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            {subMeta && <span>{subMeta}</span>}
            {subMeta && media.seasonYear && <span>•</span>}
            {media.seasonYear && <span>{media.seasonYear}</span>}
          </div>
        )}
      </div>
    </Link>
  );
}
