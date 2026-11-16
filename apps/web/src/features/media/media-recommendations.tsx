// C:\Projects\animanga-platform\apps\web\src\features\media\media-recommendations.tsx
"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { MediaCard } from "@/components/shared/media-card";
import { Button } from "@/components/ui/button";
import type { MediaCardDto } from "@/lib/api/types/media";

interface RecommendationEntry {
  media: MediaCardDto;
  score: number | null;
  rank: number | null;
}

interface MediaRecommendationsProps {
  recommendations: RecommendationEntry[];
  mediaType: "anime" | "manga";
  accentColor: string;
}

export function MediaRecommendations({
  recommendations,
  mediaType,
  accentColor,
}: MediaRecommendationsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const INITIAL_VISIBLE = 8;

  if (!recommendations || recommendations.length === 0) return null;

  const hasMore = recommendations.length > INITIAL_VISIBLE;
  const visibleItems = isExpanded
    ? recommendations
    : recommendations.slice(0, INITIAL_VISIBLE);
  const hiddenCount = recommendations.length - INITIAL_VISIBLE;

  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-center gap-2.5">
        <span
          className="w-2 h-7 rounded-sm"
          style={{ backgroundColor: accentColor }}
        />
        <h3 className="text-xl md:text-2xl font-black tracking-tight uppercase text-foreground">
          Recommended For You
        </h3>
        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-secondary text-muted-foreground border border-border">
          {recommendations.length}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5">
        {visibleItems.map((rec) => (
          <MediaCard
            key={rec.media.id}
            media={rec.media}
            mediaType={mediaType}
            badgeText={
              rec.score && rec.score > 0 ? `+${rec.score} Votes` : undefined
            }
          />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="h-10 px-5 rounded-xl font-bold text-xs sm:text-sm gap-2 bg-card hover:bg-accent border-border cursor-pointer"
          >
            <span>
              {isExpanded
                ? "Show Fewer Recommendations"
                : `Show ${hiddenCount} More Recommendations`}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" style={{ color: accentColor }} />
            ) : (
              <ChevronDown className="w-4 h-4" style={{ color: accentColor }} />
            )}
          </Button>
        </div>
      )}
    </section>
  );
}
