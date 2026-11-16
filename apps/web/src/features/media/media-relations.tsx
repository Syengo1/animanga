// C:\Projects\animanga-platform\apps\web\src\features\media\media-relations.tsx
"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Layers } from "lucide-react";
import { MediaCard } from "@/components/shared/media-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MediaRelationDto } from "@/lib/api/types/media";

interface MediaRelationsProps {
  relations: MediaRelationDto[];
  accentColor: string;
}

type RelationFilter = "ALL" | "STORY" | "ADAPTATION" | "SIDE";

const STORY_TYPES = new Set(["PREQUEL", "SEQUEL", "PARENT"]);
const ADAPTATION_TYPES = new Set(["ADAPTATION", "SOURCE"]);

export function MediaRelations({
  relations,
  accentColor,
}: MediaRelationsProps) {
  const [activeFilter, setActiveFilter] = useState<RelationFilter>("ALL");
  const [isExpanded, setIsExpanded] = useState(false);
  const INITIAL_VISIBLE = 6;

  const relevantRelations = useMemo(() => {
    if (!relations || relations.length === 0) return [];
    return relations.filter((rel) => rel.relationType !== "CHARACTER");
  }, [relations]);

  const filteredRelations = useMemo(() => {
    if (activeFilter === "ALL") return relevantRelations;
    if (activeFilter === "STORY") {
      return relevantRelations.filter((r) => STORY_TYPES.has(r.relationType));
    }
    if (activeFilter === "ADAPTATION") {
      return relevantRelations.filter((r) =>
        ADAPTATION_TYPES.has(r.relationType),
      );
    }
    return relevantRelations.filter(
      (r) =>
        !STORY_TYPES.has(r.relationType) &&
        !ADAPTATION_TYPES.has(r.relationType),
    );
  }, [relevantRelations, activeFilter]);

  if (relevantRelations.length === 0) return null;

  const hasMore = filteredRelations.length > INITIAL_VISIBLE;
  const visibleRelations = isExpanded
    ? filteredRelations
    : filteredRelations.slice(0, INITIAL_VISIBLE);
  const hiddenCount = filteredRelations.length - INITIAL_VISIBLE;

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className="w-2 h-7 rounded-sm shrink-0"
            style={{ backgroundColor: accentColor }}
          />
          <h3 className="text-xl md:text-2xl font-black tracking-tight uppercase text-foreground">
            Franchise & Relations
          </h3>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-secondary text-muted-foreground border border-border">
            {relevantRelations.length}
          </span>
        </div>

        {/* Filter Pills when franchise has > 4 entries */}
        {relevantRelations.length > 4 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {(
              [
                { id: "ALL", label: "All" },
                { id: "STORY", label: "Sequels & Prequels" },
                { id: "ADAPTATION", label: "Source & Adaptations" },
                { id: "SIDE", label: "Spin-Offs & Specials" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveFilter(tab.id);
                  setIsExpanded(false);
                }}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-bold border transition-all shrink-0 cursor-pointer",
                  activeFilter === tab.id
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-card text-muted-foreground border-border hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {filteredRelations.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-border bg-card/40 text-center text-xs sm:text-sm text-muted-foreground flex flex-col items-center gap-2">
          <Layers className="w-5 h-5 text-muted-foreground" />
          <span>No relations in this category.</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5">
            {visibleRelations.map((rel, idx) => (
              <MediaCard
                key={`${rel.media.id}-${rel.relationType}-${idx}`}
                media={rel.media}
                badgeText={rel.relationType.replace(/_/g, " ")}
                accentOverride={accentColor}
              />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="h-10 px-5 rounded-xl font-bold text-xs sm:text-sm gap-2 bg-card hover:bg-accent border-border shadow-xs cursor-pointer"
              >
                <span>
                  {isExpanded
                    ? "Show Fewer Relations"
                    : `Show ${hiddenCount} More Relations (${filteredRelations.length} Total)`}
                </span>
                {isExpanded ? (
                  <ChevronUp
                    className="w-4 h-4"
                    style={{ color: accentColor }}
                  />
                ) : (
                  <ChevronDown
                    className="w-4 h-4"
                    style={{ color: accentColor }}
                  />
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
