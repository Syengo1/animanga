"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Plus, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TABS = ["ANIME", "MANGA", "EVENTS"] as const;
type TabType = (typeof TABS)[number];

interface LiquidMediaPlayerProps {
  items: any[];
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function LiquidMediaPlayer({
  items,
  activeTab,
  onTabChange,
}: LiquidMediaPlayerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const activeItem = items?.[activeIndex];

  useEffect(() => {
    setActiveIndex(0);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ left: 0, behavior: "smooth" });
    }
  }, [activeTab]);

  useEffect(() => {
    if (!items?.length) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % items.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [items?.length, activeTab]);

  const scrollThumbnails = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = 300;
    scrollContainerRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  if (!items?.length || !activeItem) {
    return (
      <section className="w-full py-24 bg-background border-t border-white/5 relative z-20 flex flex-col items-center justify-center min-h-[600px]">
        <div className="flex p-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-full mb-10 shadow-2xl">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={cn(
                "relative px-6 py-2 rounded-full text-sm font-bold transition-colors",
                activeTab === tab
                  ? "text-white"
                  : "text-white/50 hover:text-white/90",
              )}
            >
              {activeTab === tab && (
                <motion.div
                  layoutId="empty-tab"
                  className="absolute inset-0 bg-white/10 border border-white/20 rounded-full"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10">{tab}</span>
            </button>
          ))}
        </div>
        <div className="text-white/50 font-medium">
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

  const accentColor = activeItem.colorHex || "var(--primary)";

  // Favor banner, fallback to cover
  const heroImgUrl =
    activeItem.bannerImage ??
    activeItem.coverImage?.extraLarge ??
    "/placeholder.jpg";

  return (
    <section className="w-full py-16 md:py-24 bg-background border-t border-white/5 relative z-20 overflow-hidden">
      <div className="container mx-auto px-4">
        {/* TOP ROW */}
        <div className="flex flex-col md:flex-row gap-6 lg:gap-10 mb-10 md:mb-16">
          {/* TABS */}
          <div className="flex md:flex-col gap-2 md:w-32 lg:w-48 shrink-0 overflow-x-auto no-scrollbar md:pt-4">
            {TABS.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => onTabChange(tab)}
                  className={cn(
                    "relative flex items-center px-5 py-3 md:py-4 text-sm md:text-base font-bold text-left rounded-xl transition-colors group shrink-0",
                    isActive
                      ? "text-white"
                      : "text-white/50 hover:text-white/90",
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute inset-0 bg-white/10 border border-white/20 rounded-xl"
                      transition={{
                        type: "spring",
                        bounce: 0.2,
                        duration: 0.6,
                      }}
                    />
                  )}
                  <span className="relative z-10">{tab}</span>
                </button>
              );
            })}
          </div>

          {/* PLAYER */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="relative w-full aspect-video md:aspect-[21/9] lg:aspect-[2.35/1] rounded-2xl md:rounded-[2rem] bg-black border border-white/10 overflow-hidden shadow-2xl group">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeItem.id} // Replaced activeItem.externalId
                  initial={{ opacity: 0, scale: 1.02 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="absolute inset-0"
                >
                  {heroImgUrl !== "/placeholder.jpg" && (
                    <Image
                      src={heroImgUrl}
                      alt={title}
                      fill
                      className="object-cover object-top opacity-80 mix-blend-screen"
                      priority
                    />
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent w-3/4" />

                  <div className="absolute bottom-0 left-0 p-6 md:p-10 lg:p-14 w-full md:w-3/4 lg:w-2/3 flex flex-col items-start justify-end h-full">
                    <div
                      className="w-12 h-1 rounded-full mb-4 shadow-[0_0_10px_currentColor]"
                      style={{
                        backgroundColor: accentColor,
                        color: accentColor,
                      }}
                    />
                    <h2 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tighter uppercase leading-[0.9] mb-4 text-white drop-shadow-2xl">
                      {title}
                    </h2>
                    <p className="text-sm md:text-base text-white/70 line-clamp-2 md:line-clamp-3 mb-8 font-medium max-w-xl">
                      {activeItem.synopsis
                        ? activeItem.synopsis.replace(/<\/?[^>]+(>|$)/g, "")
                        : "No description available."}
                    </p>
                    <div className="flex items-center gap-3">
                      <Button className="bg-white hover:bg-white/90 text-black h-12 md:h-14 px-8 md:px-10 rounded-xl font-bold text-base transition-transform hover:scale-105">
                        <Play className="w-5 h-5 mr-2 fill-current" /> Play
                      </Button>
                      <Button
                        variant="ghost"
                        className="bg-white/10 hover:bg-white/20 border border-white/20 text-white h-12 md:h-14 w-12 md:w-14 rounded-xl backdrop-blur-md transition-transform hover:scale-105 p-0"
                      >
                        <Plus className="w-6 h-6" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* BOTTOM ROW: THUMBNAILS */}
        <div className="flex flex-col gap-4 w-full">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xl md:text-2xl font-bold tracking-tight text-white">
              Trending {activeTab.charAt(0) + activeTab.slice(1).toLowerCase()}
            </h3>
            <div className="hidden md:flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10"
                onClick={() => scrollThumbnails("left")}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10"
                onClick={() => scrollThumbnails("right")}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div
            ref={scrollContainerRef}
            className="flex gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-6 pt-2 -mx-4 px-4 md:mx-0 md:px-0"
          >
            {items.map((item, idx) => {
              const isSelected = activeIndex === idx;
              // 1. Safely derive thumbnail title
              const itemTitle =
                item.title?.english ??
                item.title?.romaji ??
                item.title?.native ??
                "Unknown";

              // 2. Safely derive thumbnail image
              const thumbImgUrl =
                item.coverImage?.extraLarge ??
                item.coverImage?.large ??
                "/placeholder.jpg";

              return (
                <div
                  key={item.id} // Replaced item.externalId
                  onClick={() => setActiveIndex(idx)}
                  className={cn(
                    "relative aspect-video w-[240px] md:w-[280px] lg:w-[320px] shrink-0 snap-start rounded-xl overflow-hidden cursor-pointer border transition-all duration-300",
                    isSelected
                      ? "border-white/60 ring-4 ring-white/20 scale-[1.03] shadow-2xl z-10"
                      : "border-white/10 opacity-60 hover:opacity-100 hover:border-white/30",
                  )}
                >
                  {thumbImgUrl !== "/placeholder.jpg" && (
                    <Image
                      src={thumbImgUrl}
                      alt={itemTitle}
                      fill
                      className="object-cover object-center"
                      sizes="(max-width: 768px) 240px, 320px"
                    />
                  )}

                  {item.averageScore && (
                    <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded flex items-center gap-1 text-[10px] md:text-xs font-bold border border-white/10">
                      <Star className="w-3 h-3 text-yellow-500 fill-current" />
                      {(item.averageScore / 10).toFixed(1)}
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-4 opacity-100 transition-opacity duration-300">
                    <span className="text-sm font-bold text-white line-clamp-1 drop-shadow-md">
                      {itemTitle}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
