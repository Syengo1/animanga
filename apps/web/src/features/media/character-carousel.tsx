// C:\Projects\animanga-platform\apps\web\src\features\media\character-carousel.tsx
"use client";

import { useRef, useState, useMemo } from "react";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  User,
  Globe,
  LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MediaCharacterDto } from "@/lib/api/types/media";

interface CharacterCarouselProps {
  characters: MediaCharacterDto[];
  accentColor?: string;
}

export function CharacterCarousel({
  characters,
  accentColor = "var(--primary)",
}: CharacterCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isGridExpanded, setIsGridExpanded] = useState(false);

  // Discover all available voice actor languages across the cast
  const availableLanguages = useMemo(() => {
    const langs = new Set<string>();
    for (const char of characters || []) {
      for (const va of char.voiceActors || []) {
        if (va.language) langs.add(va.language);
      }
    }
    const list = Array.from(langs);
    list.sort((a, b) => {
      if (a.toLowerCase() === "japanese") return -1;
      if (b.toLowerCase() === "japanese") return 1;
      if (a.toLowerCase() === "english") return -1;
      if (b.toLowerCase() === "english") return 1;
      return a.localeCompare(b);
    });
    return list;
  }, [characters]);

  const [selectedLanguage, setSelectedLanguage] = useState<string>(
    availableLanguages[0] || "Japanese",
  );

  const scroll = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = 360;
    scrollContainerRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  if (!characters || characters.length === 0) return null;

  const renderCharacterCard = (char: MediaCharacterDto, isGrid: boolean) => {
    const matchingVa =
      char.voiceActors?.find(
        (v) => v.language?.toLowerCase() === selectedLanguage.toLowerCase(),
      ) || char.voiceActors?.[0];

    return (
      <div
        key={char.id}
        className={cn(
          "h-[96px] flex bg-card border border-border rounded-xl overflow-hidden shadow-xs transition-all hover:border-primary/40 hover:shadow-md",
          !isGrid && "shrink-0 snap-start w-[285px] md:w-[320px]",
        )}
      >
        {/* Left Side: Character */}
        <div className="flex-1 flex h-full min-w-0">
          <div className="w-[68px] h-full shrink-0 bg-muted flex items-center justify-center relative">
            {char.image ? (
              <Image
                src={char.image}
                alt={char.name}
                width={68}
                height={96}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
          <div className="flex flex-col justify-between p-2.5 min-w-0">
            <p className="text-xs md:text-sm font-bold text-foreground line-clamp-2 leading-tight">
              {char.name}
            </p>
            <span
              className={cn(
                "text-[10px] uppercase tracking-wider font-extrabold w-fit px-1.5 py-0.5 rounded",
                char.role === "MAIN"
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground",
              )}
            >
              {char.role}
            </span>
          </div>
        </div>

        {/* Right Side: Voice Actor */}
        {matchingVa && (
          <div className="flex-1 flex flex-row-reverse h-full bg-secondary/45 min-w-0 border-l border-border">
            <div className="w-[68px] h-full shrink-0 bg-muted flex items-center justify-center relative">
              {matchingVa.image ? (
                <Image
                  src={matchingVa.image}
                  alt={matchingVa.name}
                  width={68}
                  height={96}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex flex-col justify-between p-2.5 text-right min-w-0">
              <p className="text-xs md:text-sm font-bold text-foreground line-clamp-2 leading-tight">
                {matchingVa.name}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold line-clamp-1">
                {matchingVa.language}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Controls Bar: Voice Language Selector + Expand All Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {availableLanguages.length > 1 ? (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0 mr-1" />
            {availableLanguages.slice(0, 5).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setSelectedLanguage(lang)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer shrink-0",
                  selectedLanguage === lang
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-card text-muted-foreground border-border hover:text-foreground",
                )}
              >
                {lang}
              </button>
            ))}
          </div>
        ) : (
          <span />
        )}

        {characters.length > 4 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsGridExpanded((prev) => !prev)}
            className="h-8 px-3 rounded-lg font-bold text-xs gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer border border-border/60"
          >
            <LayoutGrid
              className="w-3.5 h-3.5"
              style={{ color: accentColor }}
            />
            <span>
              {isGridExpanded
                ? "Switch to Carousel"
                : `Show All Cast (${characters.length})`}
            </span>
            {isGridExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </Button>
        )}
      </div>

      {isGridExpanded ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 animate-in fade-in duration-200">
          {characters.map((char) => renderCharacterCard(char, true))}
        </div>
      ) : (
        <div className="relative group/carousel w-full">
          <Button
            variant="outline"
            size="icon"
            aria-label="Scroll characters left"
            onClick={() => scroll("left")}
            className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-card/95 border border-border shadow-md opacity-0 md:group-hover/carousel:opacity-100 transition-opacity cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 text-foreground" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            aria-label="Scroll characters right"
            onClick={() => scroll("right")}
            className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-card/95 border border-border shadow-md opacity-0 md:group-hover/carousel:opacity-100 transition-opacity cursor-pointer"
          >
            <ChevronRight className="w-4 h-4 text-foreground" />
          </Button>

          <div
            ref={scrollContainerRef}
            className="flex gap-3.5 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-2"
          >
            {characters.map((char) => renderCharacterCard(char, false))}
          </div>
        </div>
      )}
    </div>
  );
}
