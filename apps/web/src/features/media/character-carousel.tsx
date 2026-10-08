"use client";

import { useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, User } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CharacterCarouselProps {
  characters: any[];
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
      {/* Navigation Buttons (Hidden on mobile, appear on hover for desktop) */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => scroll("left")}
        className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background/80 border border-border opacity-0 md:group-hover:opacity-100 transition-opacity disabled:opacity-0"
      >
        <ChevronLeft className="w-5 h-5 text-foreground" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => scroll("right")}
        className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background/80 border border-border opacity-0 md:group-hover:opacity-100 transition-opacity"
      >
        <ChevronRight className="w-5 h-5 text-foreground" />
      </Button>

      {/* Scrolling Container */}
      <div
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-4"
      >
        {characters.map((char) => {
          const va = char.voiceActors?.[0]; // Grab the primary voice actor
          return (
            <div
              key={char.id}
              className="shrink-0 snap-start w-[280px] md:w-[320px] h-[100px] flex bg-accent border border-border rounded-xl overflow-hidden transition-colors hover:bg-white/10 hover:border-white/20"
            >
              {/* Left Side: Character */}
              <div className="flex-1 flex h-full min-w-0">
                <div className="w-[70px] h-full shrink-0 bg-background/50 flex items-center justify-center">
                  {char.image ? (
                    <Image
                      src={char.image}
                      alt={char.name}
                      width={70}
                      height={100}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-6 h-6 text-foreground/20" />
                  )}
                </div>
                <div className="flex flex-col justify-between p-2.5 min-w-0">
                  <p className="text-xs md:text-sm font-bold text-foreground line-clamp-2 leading-tight">
                    {char.name}
                  </p>
                  <p className="text-[10px] md:text-xs text-foreground/50 uppercase tracking-wider font-semibold">
                    {char.role}
                  </p>
                </div>
              </div>

              {/* Right Side: Voice Actor */}
              {va && (
                <div className="flex-1 flex flex-row-reverse h-full bg-background/20 min-w-0">
                  <div className="w-[70px] h-full shrink-0 bg-background/50 flex items-center justify-center">
                    {va.image ? (
                      <Image
                        src={va.image}
                        alt={va.name}
                        width={70}
                        height={100}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-6 h-6 text-foreground/20" />
                    )}
                  </div>
                  <div className="flex flex-col justify-between p-2.5 text-right min-w-0">
                    <p className="text-xs md:text-sm font-bold text-foreground line-clamp-2 leading-tight">
                      {va.name}
                    </p>
                    <p className="text-[10px] md:text-xs text-foreground/50 uppercase tracking-wider font-semibold line-clamp-1">
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
