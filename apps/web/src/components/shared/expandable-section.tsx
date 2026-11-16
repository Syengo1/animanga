// C:\Projects\animanga-platform\apps\web\src\components\shared\expandable-section.tsx
"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ExpandableSynopsisProps {
  html: string;
  text: string;
  accentColor?: string;
  collapseThresholdChars?: number;
}

export function ExpandableSynopsis({
  html,
  text,
  accentColor = "var(--primary)",
  collapseThresholdChars = 420,
}: ExpandableSynopsisProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLong = (text?.length || 0) > collapseThresholdChars;

  if (!html && !text) {
    return (
      <p className="text-sm text-muted-foreground italic">
        No synopsis available for this title yet.
      </p>
    );
  }

  return (
    <div className="relative flex flex-col items-start">
      <div
        className={cn(
          "relative w-full overflow-hidden transition-all duration-300",
          isLong && !isExpanded
            ? "max-h-[150px] sm:max-h-[175px]"
            : "max-h-none",
        )}
      >
        <div
          className="prose dark:prose-invert max-w-none text-foreground/85 text-sm sm:text-base font-medium leading-relaxed prose-p:mb-3.5 last:prose-p:mb-0"
          dangerouslySetInnerHTML={{ __html: html || text }}
        />

        {isLong && !isExpanded && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background via-background/85 to-transparent" />
        )}
      </div>

      {isLong && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="mt-2.5 h-8 px-3 rounded-lg font-bold text-xs gap-1.5 text-foreground hover:bg-secondary cursor-pointer border border-border/70"
        >
          <span style={{ color: accentColor }}>
            {isExpanded ? "Show Less" : "Read Full Synopsis"}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5" style={{ color: accentColor }} />
          ) : (
            <ChevronDown
              className="w-3.5 h-3.5"
              style={{ color: accentColor }}
            />
          )}
        </Button>
      )}
    </div>
  );
}

interface ExpandableCardGridProps<T> {
  items: T[];
  initialCount?: number;
  renderItem: (item: T, index: number) => ReactNode;
  gridClassName?: string;
  itemLabel?: string;
  accentColor?: string;
}

export function ExpandableCardGrid<T>({
  items,
  initialCount = 6,
  renderItem,
  gridClassName = "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5",
  itemLabel = "Items",
  accentColor = "var(--primary)",
}: ExpandableCardGridProps<T>) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!items || items.length === 0) return null;

  const hasMore = items.length > initialCount;
  const visibleItems = isExpanded ? items : items.slice(0, initialCount);
  const hiddenCount = items.length - initialCount;

  return (
    <div className="flex flex-col gap-5">
      <div className={gridClassName}>
        {visibleItems.map((item, idx) => renderItem(item, idx))}
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
                ? `Show Fewer ${itemLabel}`
                : `Show ${hiddenCount} More ${itemLabel} (${items.length} Total)`}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" style={{ color: accentColor }} />
            ) : (
              <ChevronDown className="w-4 h-4" style={{ color: accentColor }} />
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
