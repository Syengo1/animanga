"use client";

import { useState } from "react";
import { LiquidMediaPlayer } from "./liquid-media-player";
import { CatalogShowcase } from "./catalog-showcase";

export function HomeClientOrchestrator({
  animeData,
  mangaData,
}: {
  animeData: any;
  mangaData: any;
}) {
  const [activeTab, setActiveTab] = useState<"ANIME" | "MANGA" | "EVENTS">(
    "ANIME",
  );

  // Determine which dataset to use based on the global tab state
  const currentShowcase =
    activeTab === "ANIME"
      ? animeData
      : activeTab === "MANGA"
        ? mangaData
        : null;
  const currentTrending = currentShowcase?.categories[0]?.items || []; // First row is always trending

  return (
    <>
      <LiquidMediaPlayer
        items={currentTrending}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {activeTab !== "EVENTS" && currentShowcase ? (
        <CatalogShowcase
          categories={currentShowcase.categories}
          error={currentShowcase.error}
        />
      ) : (
        <section className="py-24 flex items-center justify-center min-h-[400px]">
          <div className="text-white/50 font-medium">
            Coming Soon: Platform Events & Conventions
          </div>
        </section>
      )}
    </>
  );
}
