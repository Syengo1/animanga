// C:\Projects\animanga-platform\apps\web\src\features\home\void-hero.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import InteractiveSphereGallery from "@/components/canvas/InteractiveSphereGallery";
import ScrollIndicator from "@/components/canvas/ScrollIndicator";
import { SparklesCore } from "@/components/SparklesCore";
import { getThemeTokens } from "@/config/theme.config";

export function VoidHero() {
  const { resolvedTheme } = useTheme();
  const { sparkleColor } = getThemeTokens(resolvedTheme);
  const sectionRef = useRef<HTMLElement>(null);
  const [isIntersecting, setIsIntersecting] = useState(true);
  const [isTabActive, setIsTabActive] = useState(true);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsIntersecting(entry.isIntersecting),
      { threshold: 0.02 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabActive(document.visibilityState === "visible");
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  const isHeroActive = isIntersecting && isTabActive;

  return (
    <section
      id="void-hero-section"
      ref={sectionRef}
      className="relative w-full h-[calc(100svh-4rem)] min-h-[520px] bg-background overflow-hidden"
    >
      <SparklesCore
        id="void-hero-sparkles"
        background="transparent"
        minSize={1.2}
        maxSize={2.2}
        particleDensity={0.12}
        particleSpeed={0.2}
        speed={0.5}
        particleColor={sparkleColor}
        paused={!isHeroActive}
        className="absolute inset-0 w-full h-full"
      >
        <InteractiveSphereGallery isVisible={isHeroActive} />
        <ScrollIndicator />
      </SparklesCore>
    </section>
  );
}
