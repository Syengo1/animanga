"use client";

import InteractiveSphereGallery from "@/components/canvas/InteractiveSphereGallery";
import ScrollIndicator from "@/components/canvas/ScrollIndicator";
import { SparklesCore } from "@/components/SparklesCore";
import { useTheme } from "next-themes";

export function VoidHero() {
  const { resolvedTheme } = useTheme();

  // Make the sparkles a beautiful visible grey in Light Mode, and white/silver in Dark mode
  const sparkleColor = resolvedTheme === "light" ? "#888888" : "#9ba1a5";

  return (
    <section className="relative w-full h-[100svh] bg-background overflow-hidden">
      <SparklesCore
        id="void-hero-sparkles"
        background="transparent"
        minSize={1.5}
        maxSize={1}
        particleDensity={0.1}
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
