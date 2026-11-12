// C:\Projects\animanga-platform\apps\web\src\features\media\character-carousel.tsx
"use client";

import { useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MediaCharacterDto } from "@/lib/api/types/media";

interface CharacterCarouselProps {
  characters: MediaCharacterDto[];
}

export function CharacterCarousel({ characters }: CharacterCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = 350;
    scrollContainerRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  if (!characters || characters.length === 0) return null;

  return (
    <div className="relative group/carousel w-full">
      <Button
        variant="outline"
        size="icon"
        aria-label="Scroll characters left"
        onClick={() => scroll("left")}
        className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-card/90 border border-border shadow-md opacity-0 md:group-hover/carousel:opacity-100 transition-opacity"
      >
        <ChevronLeft className="w-4 h-4 text-foreground" />
      </Button>

      <Button
        variant="outline"
        size="icon"
        aria-label="Scroll characters right"
        onClick={() => scroll("right")}
        className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-card/90 border border-border shadow-md opacity-0 md:group-hover/carousel:opacity-100 transition-opacity"
      >
        <ChevronRight className="w-4 h-4 text-foreground" />
      </Button>

      <div
        ref={scrollContainerRef}
        className="flex gap-3.5 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-2"
      >
        {characters.map((char) => {
          const va = char.voiceActors?.[0];
          return (
            <div
              key={char.id}
              className="shrink-0 snap-start w-[280px] md:w-[320px] h-[96px] flex bg-card border border-border rounded-xl overflow-hidden shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
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
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                    {char.role}
                  </p>
                </div>
              </div>

              {/* Right Side: Voice Actor */}
              {va && (
                <div className="flex-1 flex flex-row-reverse h-full bg-secondary/50 min-w-0 border-l border-border">
                  <div className="w-[68px] h-full shrink-0 bg-muted flex items-center justify-center relative">
                    {va.image ? (
                      <Image
                        src={va.image}
                        alt={va.name}
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
                      {va.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold line-clamp-1">
                      {va.language}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
