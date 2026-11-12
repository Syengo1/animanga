// C:\Projects\animanga-platform\apps\web\src\features\home\liquid-media-player.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Info,
  Plus,
  Star,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Tv,
  BookOpen,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TABS = ["ANIME", "MANGA", "EVENTS"] as const;
type TabType = (typeof TABS)[number];

interface LiquidMediaPlayerProps {
  items: any[];
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const AUTO_ADVANCE_MS = 6500;

export function LiquidMediaPlayer({
  items,
  activeTab,
  onTabChange,
}: LiquidMediaPlayerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const thumbRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeItem = items?.[activeIndex];

  // Reset to first slide when tab switches
  useEffect(() => {
    setActiveIndex(0);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ left: 0, behavior: "smooth" });
    }
  }, [activeTab]);

  // Synchronize horizontal thumbnail slider position whenever activeIndex changes
  useEffect(() => {
    const container = scrollContainerRef.current;
    const activeThumb = thumbRefs.current[activeIndex];
    if (!container || !activeThumb) return;

    const containerWidth = container.clientWidth;
    const thumbLeft = activeThumb.offsetLeft;
    const thumbWidth = activeThumb.offsetWidth;

    // Center the active thumbnail inside the horizontal scroll track
    const targetScrollLeft = Math.max(
      0,
      thumbLeft - containerWidth / 2 + thumbWidth / 2,
    );

    container.scrollTo({
      left: targetScrollLeft,
      behavior: "smooth",
    });
  }, [activeIndex]);

  // Auto-advance timer (pauses when user hovers or focuses the player)
  useEffect(() => {
    if (!items?.length || isPaused) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % items.length);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(interval);
  }, [items?.length, activeTab, isPaused]);

  const goToSlide = useCallback(
    (direction: "prev" | "next") => {
      if (!items?.length) return;
      setActiveIndex((prev) =>
        direction === "next"
          ? (prev + 1) % items.length
          : (prev - 1 + items.length) % items.length,
      );
    },
    [items?.length],
  );

  if (!items?.length || !activeItem) {
    return (
      <section className="w-full py-12 bg-background border-t border-border relative z-20 flex flex-col items-center justify-center min-h-[380px]">
        <div
          role="tablist"
          aria-label="Content category tabs"
          className="flex p-1.5 bg-secondary border border-border rounded-full mb-8 shadow-lg"
        >
          {TABS.map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => onTabChange(tab)}
              className={cn(
                "relative px-6 py-2 rounded-full text-sm font-bold transition-colors cursor-pointer",
                activeTab === tab
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {activeTab === tab && (
                <motion.div
                  layoutId="empty-tab"
                  className="absolute inset-0 bg-primary rounded-full shadow-sm"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                />
              )}
              <span className="relative z-10">{tab}</span>
            </button>
          ))}
        </div>
        <div className="text-muted-foreground font-medium">
          Coming Soon: Platform Events & Conventions
        </div>
      </section>
    );
  }

  const title =
    activeItem.title?.english ??
    activeItem.title?.romaji ??
    activeItem.title?.native ??
    "Unknown";
  const accentColor = activeItem.colorHex || "#6366f1";
  const heroImgUrl =
    activeItem.bannerImage ??
    activeItem.coverImage?.extraLarge ??
    activeItem.coverImage?.large ??
    "/placeholder.jpg";
  const posterImgUrl =
    activeItem.coverImage?.extraLarge ??
    activeItem.coverImage?.large ??
    heroImgUrl;

  const formattedScore = activeItem.averageScore
    ? (activeItem.averageScore / 10).toFixed(1)
    : null;

  return (
    <section
      aria-label="Featured Trending Media"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="w-full pt-8 pb-6 md:pt-12 md:pb-8 bg-background border-t border-border relative z-20 overflow-hidden"
    >
      {/* Subtle Ambient Glow matching the active media's dominant color */}
      <div
        className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[75vw] h-[320px] rounded-full blur-[130px] opacity-20 dark:opacity-25 transition-colors duration-1000"
        style={{ backgroundColor: accentColor }}
      />

      <div className="container mx-auto px-4 relative z-10">
        {/* TOP ROW: Category Switcher + Vibrant Widescreen Stage */}
        <div className="flex flex-col md:flex-row gap-4 lg:gap-6 mb-6 md:mb-8">
          {/* TABS */}
          <div
            role="tablist"
            aria-label="Media type switcher"
            className="flex md:flex-col gap-2 md:w-36 lg:w-44 shrink-0 overflow-x-auto no-scrollbar md:pt-2"
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => onTabChange(tab)}
                  className={cn(
                    "relative flex items-center justify-between px-4 py-3 md:py-3.5 text-xs md:text-sm font-black tracking-wider uppercase text-left rounded-xl transition-all cursor-pointer shrink-0",
                    isActive
                      ? "text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/70",
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute inset-0 bg-primary rounded-xl"
                      transition={{
                        type: "spring",
                        bounce: 0.2,
                        duration: 0.5,
                      }}
                    />
                  )}
                  <span className="relative z-10">{tab}</span>
                  {isActive && (
                    <span className="relative z-10 hidden md:inline-block w-2 h-2 rounded-full bg-primary-foreground" />
                  )}
                </button>
              );
            })}
          </div>

          {/* VIBRANT MEDIA STAGE */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="relative w-full min-h-[340px] sm:min-h-[380px] aspect-video md:aspect-[21/9] lg:aspect-[2.35/1] rounded-2xl md:rounded-3xl bg-neutral-950 border border-border overflow-hidden shadow-xl group">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeItem.id}
                  initial={{ opacity: 0, scale: 1.03 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.99 }}
                  transition={{ duration: 0.55, ease: "easeOut" }}
                  className="absolute inset-0"
                >
                  {heroImgUrl !== "/placeholder.jpg" && (
                    <Image
                      src={heroImgUrl}
                      alt={title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 85vw, 1200px"
                      className="object-cover object-center saturate-[1.12] contrast-[1.04] transition-transform duration-[6500ms] ease-out group-hover:scale-105"
                      priority
                    />
                  )}

                  {/* Rich Multi-Stop Cinema Gradients (Preserves full color on the right while keeping text 100% readable) */}
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/45 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-r from-neutral-950/95 via-neutral-950/65 to-transparent w-full md:w-4/5 lg:w-2/3" />

                  {/* Content Overlay */}
                  <div className="absolute inset-0 p-5 sm:p-7 md:p-10 lg:p-12 flex items-end justify-between gap-6">
                    <div className="w-full md:w-3/4 lg:w-3/5 flex flex-col items-start justify-end">
                      {/* Metadata Pill Row */}
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider text-white shadow-sm"
                          style={{ backgroundColor: accentColor }}
                        >
                          <Sparkles className="w-3 h-3" />#{activeIndex + 1}{" "}
                          Trending
                        </span>

                        {formattedScore && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-xs font-bold text-amber-400">
                            <Star className="w-3.5 h-3.5 fill-current" />
                            {formattedScore}
                          </span>
                        )}

                        {activeItem.format && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[11px] font-bold uppercase text-white/90">
                            {activeTab === "ANIME" ? (
                              <Tv className="w-3 h-3" />
                            ) : (
                              <BookOpen className="w-3 h-3" />
                            )}
                            {String(activeItem.format).replace(/_/g, " ")}
                          </span>
                        )}

                        {activeItem.seasonYear && (
                          <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[11px] font-bold text-white/80">
                            {activeItem.season ? `${activeItem.season} ` : ""}
                            {activeItem.seasonYear}
                          </span>
                        )}
                      </div>

                      <h2 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-black tracking-tight uppercase leading-[0.95] mb-3 text-white drop-shadow-lg line-clamp-2">
                        {title}
                      </h2>

                      <p className="text-xs sm:text-sm md:text-base text-white/80 line-clamp-2 md:line-clamp-3 mb-5 font-medium max-w-xl leading-relaxed">
                        {activeItem.synopsis
                          ? activeItem.synopsis.replace(/<\/?[^>]+(>|$)/g, "")
                          : "Explore full episodes, cast details, and community rankings on Animanga."}
                      </p>

                      <div className="flex items-center gap-3">
                        <Link
                          href={`/${activeTab.toLowerCase()}/${activeItem.id}`}
                          className={cn(
                            buttonVariants({ variant: "default" }),
                            "bg-white hover:bg-white/90 text-neutral-950 h-10 sm:h-11 md:h-12 px-5 sm:px-7 rounded-xl font-bold text-xs sm:text-sm md:text-base transition-transform hover:scale-[1.03] shadow-lg",
                          )}
                        >
                          <Info className="w-4 h-4 mr-2" /> Explore Title
                        </Link>
                        <Button
                          variant="ghost"
                          aria-label={`Add ${title} to watchlist`}
                          className="bg-white/15 hover:bg-white/25 border border-white/20 text-white h-10 sm:h-11 md:h-12 w-10 sm:w-11 md:w-12 rounded-xl backdrop-blur-md transition-transform hover:scale-[1.03] p-0"
                        >
                          <Plus className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>

                    {/* Floating Crisp Poster Card on Large Screens */}
                    {posterImgUrl && posterImgUrl !== "/placeholder.jpg" && (
                      <Link
                        href={`/${activeTab.toLowerCase()}/${activeItem.id}`}
                        className="hidden lg:block relative w-36 xl:w-44 aspect-[2/3] rounded-2xl overflow-hidden border-2 border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.8)] shrink-0 group/poster transition-transform duration-500 hover:scale-105"
                      >
                        <Image
                          src={posterImgUrl}
                          alt={`${title} Poster`}
                          fill
                          sizes="180px"
                          className="object-cover"
                        />
                      </Link>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Progress Indicator Bar at bottom of Player */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/15 z-20">
                <motion.div
                  key={`${activeItem.id}-${isPaused}`}
                  initial={{ width: "0%" }}
                  animate={{ width: isPaused ? "0%" : "100%" }}
                  transition={{
                    duration: isPaused ? 0 : AUTO_ADVANCE_MS / 1000,
                    ease: "linear",
                  }}
                  className="h-full"
                  style={{ backgroundColor: accentColor }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM ROW: SYNCHRONIZED THUMBNAIL SLIDER */}
        <div className="flex flex-col gap-3 w-full">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5">
              <span
                className="w-2 h-6 rounded-full"
                style={{ backgroundColor: accentColor }}
              />
              <h3 className="text-lg md:text-xl font-black tracking-tight uppercase text-foreground">
                Trending{" "}
                {activeTab.charAt(0) + activeTab.slice(1).toLowerCase()}
              </h3>
              <span className="text-xs font-bold text-muted-foreground tabular-nums ml-1">
                ({activeIndex + 1} / {items.length})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                aria-label="Previous trending item"
                className="h-8 w-8 rounded-full bg-card hover:bg-accent border border-border"
                onClick={() => goToSlide("prev")}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label="Next trending item"
                className="h-8 w-8 rounded-full bg-card hover:bg-accent border border-border"
                onClick={() => goToSlide("next")}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div
            ref={scrollContainerRef}
            className="flex gap-3.5 md:gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar py-2 -mx-4 px-4 md:mx-0 md:px-0"
          >
            {items.map((item, idx) => {
              const isSelected = activeIndex === idx;
              const itemTitle =
                item.title?.english ??
                item.title?.romaji ??
                item.title?.native ??
                "Unknown";
              const thumbImgUrl =
                item.bannerImage ??
                item.coverImage?.extraLarge ??
                item.coverImage?.large ??
                "/placeholder.jpg";
              const itemColor = item.colorHex || "var(--primary)";

              return (
                <button
                  key={item.id}
                  ref={(el) => {
                    thumbRefs.current[idx] = el;
                  }}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  aria-label={`Select ${itemTitle}`}
                  aria-current={isSelected ? "true" : undefined}
                  className={cn(
                    "relative aspect-video w-[200px] sm:w-[230px] md:w-[260px] shrink-0 snap-start rounded-xl overflow-hidden cursor-pointer border text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    isSelected
                      ? "border-primary ring-2 ring-primary/40 scale-[1.02] shadow-lg z-10 opacity-100"
                      : "border-border opacity-65 hover:opacity-100 hover:border-foreground/30",
                  )}
                >
                  {thumbImgUrl !== "/placeholder.jpg" && (
                    <Image
                      src={thumbImgUrl}
                      alt={itemTitle}
                      fill
                      className="object-cover object-center transition-transform duration-500 hover:scale-105"
                      sizes="(max-width: 768px) 200px, 260px"
                    />
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1">
                    <span className="px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-md text-[10px] font-black text-white/90 border border-white/10">
                      #{idx + 1}
                    </span>
                    {item.averageScore && (
                      <div className="bg-black/70 backdrop-blur-md px-1.5 py-0.5 rounded flex items-center gap-1 text-[10px] font-bold text-amber-400 border border-white/10">
                        <Star className="w-2.5 h-2.5 fill-current" />
                        {(item.averageScore / 10).toFixed(1)}
                      </div>
                    )}
                  </div>

                  <div className="absolute inset-x-0 bottom-0 p-3 flex flex-col justify-end">
                    <span className="text-xs sm:text-sm font-bold text-white line-clamp-1 drop-shadow">
                      {itemTitle}
                    </span>
                    {isSelected && (
                      <span
                        className="mt-1 h-0.5 w-8 rounded-full"
                        style={{ backgroundColor: itemColor }}
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
