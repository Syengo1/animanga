// C:\Projects\animanga-platform\apps\web\src\components\canvas\InteractiveSphereGallery.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useProgress } from "@react-three/drei";
import { ArrowRight } from "lucide-react";
import Scene from "@/components/canvas/Scene";
import SphereGallery from "@/components/canvas/SphereGallery";
import { cn } from "@/lib/utils";

interface InteractiveSphereGalleryProps {
  onIntroComplete?: () => void;
}

type IntroPhase = "loading" | "ready" | "entering" | "complete";

export default function InteractiveSphereGallery({
  onIntroComplete,
}: InteractiveSphereGalleryProps) {
  const [phase, setPhase] = useState<IntroPhase>("loading");
  const [gpuReady, setGpuReady] = useState(false);
  const [, setSelectedProjectId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const onIntroCompleteRef = useRef(onIntroComplete);
  useEffect(() => {
    onIntroCompleteRef.current = onIntroComplete;
  }, [onIntroComplete]);

  const { progress } = useProgress();

  // 1. Cap visual progress at 99% until the GPU actually renders the first frames.
  // Using Math.floor prevents the text from rounding 99.6 up to 100 prematurely.
  const displayProgress =
    phase === "loading" ? Math.min(Math.floor(progress), 99) : 100;

  // 2. Harmonized Readiness Progression
  useEffect(() => {
    // The exact moment the network finishes AND the GPU paints the scene,
    // we instantly unlock the experience. No artificial delays, perfect harmony.
    if (phase === "loading" && progress >= 100 && gpuReady) {
      setPhase("ready");
    }
  }, [progress, gpuReady, phase]);

  // 3. Cinematic Entrance Timer
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (phase === "entering") {
      timer = setTimeout(() => {
        setPhase("complete");
        if (onIntroCompleteRef.current) onIntroCompleteRef.current();
      }, 1800);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [phase]);

  const handleEnter = useCallback(() => {
    if (phase !== "ready") return;
    setPhase("entering");
  }, [phase]);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!containerRef.current) return;
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const opacity = Math.max(1 - scrollY / (windowHeight * 0.8), 0);

      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (containerRef.current) {
            containerRef.current.style.opacity = opacity.toString();
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isReady = phase === "ready";
  const isEntering = phase === "entering";
  const isComplete = phase === "complete";

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full will-change-[opacity]"
    >
      <Scene>
        <SphereGallery
          triggerIntro={isEntering || isComplete}
          onReady={() => setGpuReady(true)}
          onIntroComplete={() => {
            setPhase("complete");
            if (onIntroCompleteRef.current) onIntroCompleteRef.current();
          }}
        />
      </Scene>

      {!isComplete && (
        <div
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center z-50",
            "transition-all duration-[1500ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
            isEntering
              ? "opacity-0 pointer-events-none scale-105 bg-transparent backdrop-blur-none"
              : isReady
                ? "opacity-100 bg-background/60 backdrop-blur-sm"
                : "opacity-100 bg-background/95 backdrop-blur-xl",
          )}
        >
          {/* Ambient Background Glows */}
          <div
            className={cn(
              "absolute inset-0 overflow-hidden pointer-events-none transition-opacity duration-1000",
              isReady ? "opacity-0" : "opacity-100",
            )}
          >
            <div className="absolute top-1/4 left-1/4 w-[40vw] h-[40vw] max-w-lg max-h-lg bg-primary/10 rounded-full blur-[100px] animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-[40vw] h-[40vw] max-w-lg max-h-lg bg-primary/5 rounded-full blur-[100px] animate-pulse delay-1000" />
          </div>

          <div className="relative z-10 flex flex-col items-center text-center max-w-4xl px-4 w-full">
            <div
              className={cn(
                "transition-all duration-1000 ease-out transform flex flex-col items-center",
                isEntering
                  ? "-translate-y-8 opacity-0"
                  : "translate-y-0 opacity-100",
              )}
            >
              <span className="text-xs md:text-sm font-bold tracking-[0.3em] uppercase text-primary mb-4 drop-shadow-md">
                Welcome to Animanga
              </span>

              <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter uppercase text-white mb-6 drop-shadow-2xl">
                Your Universe <br className="hidden md:block" />
                <span className="text-white/70">Of Anime & Manga</span>
              </h1>

              <p className="text-sm md:text-base lg:text-lg font-medium text-white/60 tracking-wide mb-12 max-w-2xl leading-relaxed">
                Discover what's airing, find your next obsession, explore manga,
                meet the community, and experience the culture beyond the
                screen.
              </p>
            </div>

            <button
              type="button"
              onClick={handleEnter}
              disabled={!isReady || isEntering}
              aria-label={
                isReady
                  ? "Enter the Animanga 3D experience"
                  : "Loading Experience"
              }
              className={cn(
                "group relative h-14 md:h-16 rounded-full transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                isEntering ? "opacity-0 scale-95" : "opacity-100 delay-150",
                isReady
                  ? "w-64 md:w-72 cursor-pointer border border-primary/50 bg-primary/20 text-white font-black tracking-[0.2em] uppercase text-sm md:text-base shadow-[0_0_30px_rgba(0,0,0,0.5)] hover:bg-primary/30 hover:scale-[1.02] hover:border-primary"
                  : "w-72 md:w-96 cursor-wait border border-white/10 bg-white/5",
              )}
            >
              <div
                className={cn(
                  "absolute inset-0 flex items-center justify-center transition-opacity duration-700",
                  isReady ? "opacity-100" : "opacity-0",
                )}
              >
                <span className="drop-shadow-md">Enter Peak</span>
                <ArrowRight className="w-5 h-5 ml-3 transition-transform group-hover:translate-x-1" />
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              <div
                className={cn(
                  "absolute inset-0 transition-opacity duration-700",
                  isReady ? "opacity-0" : "opacity-100",
                )}
              >
                <div
                  className="absolute left-0 top-0 bottom-0 bg-primary transition-all duration-300 ease-out"
                  style={{ width: `${displayProgress}%` }}
                >
                  <div className="absolute top-0 right-0 bottom-0 w-12 bg-gradient-to-r from-transparent to-white/30 blur-[2px]" />
                </div>

                <div className="absolute inset-0 z-10 flex items-center justify-center gap-3 text-white/80 font-bold tracking-[0.2em] uppercase text-xs md:text-sm">
                  <span>Preparing Experience</span>
                  <span className="w-12 text-right tabular-nums">
                    {displayProgress}%
                  </span>
                </div>
              </div>
            </button>

            <div
              className={cn(
                "mt-8 text-[10px] md:text-xs font-bold tracking-[0.3em] uppercase transition-opacity duration-1000 flex items-center",
                isReady
                  ? "opacity-100 text-primary"
                  : "opacity-0 text-white/40",
              )}
              aria-live="polite"
            >
              <span
                className={cn(
                  "inline-block w-2 h-2 rounded-full mr-3",
                  isReady
                    ? "bg-primary animate-pulse shadow-[0_0_10px_currentColor]"
                    : "bg-white/20",
                )}
              />
              {isReady ? "3D Experience Is Ready" : "Initializing..."}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
