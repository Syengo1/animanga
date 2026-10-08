"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Star, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

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
      <div className="container mx-auto px-4 py-24">
        <div className="p-4 border border-destructive bg-destructive/10 text-destructive rounded-lg mb-8">
          Failed to load media catalog. Please try again later.
        </div>
      </div>
    );
  }

  return (
    <section className="py-16 md:py-24 bg-background relative z-20 flex flex-col gap-12 md:gap-16">
      {categories.map((category) => (
        <MediaRow key={category.id} category={category} />
      ))}
    </section>
  );
}

function MediaRow({ category }: { category: MediaCategory }) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const routeType = category.href.split("/")[1] || "anime";

  const scroll = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return;
    const clientWidth = scrollContainerRef.current.clientWidth;
    const scrollAmount =
      direction === "left" ? -clientWidth + 100 : clientWidth - 100;
    scrollContainerRef.current.scrollBy({
      left: scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="container mx-auto px-4 flex items-end justify-between">
        <Link href={category.href} className="group flex items-center gap-2">
          <h3 className="text-xl md:text-2xl font-bold tracking-tight hover:text-primary transition-colors text-foreground">
            {category.title}
          </h3>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </Link>
      </div>

      <div className="relative group/slider">
        <div
          ref={scrollContainerRef}
          className="flex gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory no-scrollbar px-4 md:px-8 lg:px-12 pb-4"
        >
          {category.items.map((media) => (
            <MediaPortraitCard key={media.id} media={media} type={routeType} />
          ))}
          <Link
            href={category.href}
            className="shrink-0 snap-start w-[140px] md:w-[180px] lg:w-[200px] aspect-[2/3] rounded-xl border border-border bg-accent flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-foreground hover:bg-foreground/10 hover:border-foreground/20 transition-all"
          >
            <div className="w-12 h-12 rounded-full bg-background/50 flex items-center justify-center">
              <ArrowRight className="w-6 h-6" />
            </div>
            <span className="font-bold text-sm">View All</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function MediaPortraitCard({ media, type }: { media: any; type: string }) {
  const title =
    media.title?.english ??
    media.title?.romaji ??
    media.title?.native ??
    "Unknown";
  const coverUrl =
    media.coverImage?.extraLarge ??
    media.coverImage?.large ??
    "/placeholder.jpg";
  const dominantColor = media.colorHex || "var(--primary)";

  return (
    <Link
      href={`/${type}/${media.id}`}
      className="shrink-0 snap-start w-[140px] md:w-[180px] lg:w-[200px] flex flex-col gap-3 group cursor-pointer"
    >
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-accent border border-border transition-all duration-300 group-hover:border-foreground/30 group-hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
        {coverUrl && coverUrl !== "/placeholder.jpg" && (
          <Image
            src={coverUrl}
            alt={title}
            fill
            sizes="(max-width: 768px) 140px, (max-width: 1024px) 180px, 200px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {media.averageScore && (
          <div className="absolute top-2 left-2 bg-background/80 backdrop-blur-md px-1.5 py-0.5 rounded flex items-center gap-1 text-[10px] md:text-xs font-bold border border-border z-10 text-foreground">
            <Star className="w-3 h-3 text-yellow-500 fill-current" />
            {media.averageScore}%
          </div>
        )}
        <div
          className="absolute bottom-2 left-2 right-2 px-2 py-1 rounded bg-background/80 backdrop-blur-md text-[10px] font-bold text-center border border-border opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 z-10"
          style={{ color: dominantColor }}
        >
          {media.status}
        </div>
      </div>
      <h4 className="text-sm md:text-base font-semibold leading-tight line-clamp-2 text-foreground group-hover:text-primary transition-colors">
        {title}
      </h4>
    </Link>
  );
}
