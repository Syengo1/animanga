// C:\Projects\animanga-platform\apps\web\src\features\home\void-hero.tsx
"use client";

import InteractiveSphereGallery from "@/components/canvas/InteractiveSphereGallery";
import ScrollIndicator from "@/components/canvas/ScrollIndicator";
import { SparklesCore } from "@/components/SparklesCore";
import { useTheme } from "next-themes";
import { getThemeTokens } from "@/config/theme.config";

export function VoidHero() {
  const { resolvedTheme } = useTheme();
  const { sparkleColor } = getThemeTokens(resolvedTheme);

  return (
    <section className="relative w-full h-[100svh] bg-background overflow-hidden">
      <SparklesCore
        id="void-hero-sparkles"
        background="transparent"
        minSize={1.2}
        maxSize={2.2}
        particleDensity={0.12}
        particleSpeed={0.2}
        speed={0.5}
        particleColor={sparkleColor}
        className="absolute inset-0 w-full h-full"
      >
        <InteractiveSphereGallery />
        <ScrollIndicator />
      </SparklesCore>
    </section>
  );
}
