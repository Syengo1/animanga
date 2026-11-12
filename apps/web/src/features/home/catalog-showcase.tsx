// C:\Projects\animanga-platform\apps\web\src\features\home\catalog-showcase.tsx
"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronRight, ChevronLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MediaCard } from "@/components/shared/media-card";

interface MediaCategory {
  id: string;
  title: string;
  href: string;
  items: any[];
}

interface CatalogShowcaseProps {
  categories: MediaCategory[];
  error?: boolean;
}

export function CatalogShowcase({ categories, error }: CatalogShowcaseProps) {
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="p-4 border border-destructive/40 bg-destructive/10 text-destructive rounded-xl text-sm font-medium">
          Failed to load media catalog. Please refresh or try again shortly.
        </div>
      </div>
    );
  }

  if (!categories || categories.length === 0) return null;

  return (
    <section
      aria-label="Media Catalog Categories"
      className="py-6 md:py-10 bg-background relative z-20 flex flex-col gap-7 md:gap-9"
    >
      {categories.map((category) => (
        <MediaRow key={category.id} category={category} />
      ))}
    </section>
  );
}

function MediaRow({ category }: { category: MediaCategory }) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const routeType = (category.href.split("/")[1] || "anime") as
    | "anime"
    | "manga";

  const scroll = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return;
    const clientWidth = scrollContainerRef.current.clientWidth;
    const scrollAmount =
      direction === "left" ? -(clientWidth * 0.75) : clientWidth * 0.75;
    scrollContainerRef.current.scrollBy({
      left: scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="container mx-auto px-4 flex items-center justify-between">
        <Link
          href={category.href}
          className="group flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
        >
          <span className="w-1.5 h-5 rounded-full bg-primary" />
          <h3 className="text-lg md:text-xl font-black tracking-tight uppercase group-hover:text-primary transition-colors text-foreground">
            {category.title}
          </h3>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href={category.href}
            className="text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors mr-1"
          >
            View All
          </Link>
          <div className="hidden sm:flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              onClick={() => scroll("left")}
              aria-label={`Scroll ${category.title} left`}
              className="h-7 w-7 rounded-full bg-card hover:bg-accent border-border"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => scroll("right")}
              aria-label={`Scroll ${category.title} right`}
              className="h-7 w-7 rounded-full bg-card hover:bg-accent border-border"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4">
        <div
          ref={scrollContainerRef}
          className="flex gap-3.5 md:gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-2 pt-1"
        >
          {category.items.map((media) => (
            <div
              key={media.id}
              className="shrink-0 snap-start w-[145px] sm:w-[165px] md:w-[185px] lg:w-[195px]"
            >
              <MediaCard media={media} mediaType={routeType} />
            </div>
          ))}

          <Link
            href={category.href}
            className="shrink-0 snap-start w-[145px] sm:w-[165px] md:w-[185px] lg:w-[195px] aspect-[2/3] rounded-xl border border-dashed border-border bg-card/60 flex flex-col items-center justify-center gap-2.5 text-muted-foreground hover:text-foreground hover:bg-accent hover:border-primary/40 transition-all group"
          >
            <div className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
              <ArrowRight className="w-5 h-5" />
            </div>
            <span className="font-bold text-xs uppercase tracking-wider">
              Explore All
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
