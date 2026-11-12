// C:\Projects\animanga-platform\apps\web\src\features\home\home-client-orchestrator.tsx
"use client";

import { useState } from "react";
import { LiquidMediaPlayer } from "./liquid-media-player";
import { CatalogShowcase } from "./catalog-showcase";

interface ShowcaseDataset {
  error: string | null;
  featured: any[];
  categories: Array<{
    id: string;
    title: string;
    href: string;
    items: any[];
  }>;
}

export function HomeClientOrchestrator({
  animeData,
  mangaData,
}: {
  animeData: ShowcaseDataset;
  mangaData: ShowcaseDataset;
}) {
  const [activeTab, setActiveTab] = useState<"ANIME" | "MANGA" | "EVENTS">(
    "ANIME",
  );

  const currentShowcase =
    activeTab === "ANIME"
      ? animeData
      : activeTab === "MANGA"
        ? mangaData
        : null;

  const currentTrending = currentShowcase?.featured?.length
    ? currentShowcase.featured
    : currentShowcase?.categories?.[0]?.items || [];

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
          error={Boolean(currentShowcase.error)}
        />
      ) : (
        <section className="py-12 flex items-center justify-center min-h-[260px]">
          <div className="text-muted-foreground font-medium">
            Coming Soon: Platform Events & Conventions
          </div>
        </section>
      )}
    </>
  );
}
