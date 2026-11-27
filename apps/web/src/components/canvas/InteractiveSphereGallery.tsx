// C:\Projects\animanga-platform\apps\web\src\components\canvas\InteractiveSphereGallery.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowRight } from "lucide-react";
import Scene from "@/components/canvas/Scene";
import SphereGallery from "@/components/canvas/SphereGallery";
import GalleryCaptionOverlay, {
  type SelectedGalleryItem,
  type GalleryPointerState,
} from "@/components/canvas/GalleryCaptionOverlay";
import { preloadAllGalleryTextures } from "@/components/canvas/galleryTextureStore";
import { cn } from "@/lib/utils";

export interface InteractiveSphereGalleryProps {
  onIntroComplete?: () => void;
  isVisible?: boolean;
}

type IntroPhase = "loading" | "ready" | "entering" | "complete";

export default function InteractiveSphereGallery({
  onIntroComplete,
  isVisible = true,
}: InteractiveSphereGalleryProps) {
  const [phase, setPhase] = useState<IntroPhase>("loading");
  const [texturesReady, setTexturesReady] = useState(false);
  const [gpuReady, setGpuReady] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [selectedItem, setSelectedItem] = useState<SelectedGalleryItem | null>(
    null,
  );
  const [clearSignal, setClearSignal] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const introCompleteFiredRef = useRef(false);
  const pointerRef = useRef<GalleryPointerState>({
    x: 0,
    y: 0,
    containerWidth: 1280,
    containerHeight: 720,
    isTouch: false,
    initialized: false,
  });

  const onIntroCompleteRef = useRef(onIntroComplete);
  useEffect(() => {
    onIntroCompleteRef.current = onIntroComplete;
  }, [onIntroComplete]);

  const finishIntroOnce = useCallback(() => {
    setPhase("complete");
    if (!introCompleteFiredRef.current) {
      introCompleteFiredRef.current = true;
      onIntroCompleteRef.current?.();
    }
  }, []);

  // Preload all 94 textures with monotonic progress
  useEffect(() => {
    let active = true;
    const isMobile = window.innerWidth < 768;

    void preloadAllGalleryTextures(isMobile, (pct) => {
      if (!active) return;
      setLoadProgress((prev) => Math.max(prev, pct));
    }).then(() => {
      if (!active) return;
      setLoadProgress((prev) => Math.max(prev, 98));
      setTexturesReady(true);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (phase === "loading" && texturesReady && gpuReady) {
      const timer = window.setTimeout(() => {
        setLoadProgress(100);
        setPhase("ready");
      }, 250);
      return () => window.clearTimeout(timer);
    }
  }, [texturesReady, gpuReady, phase]);

  const displayProgress =
    phase === "loading" ? (gpuReady ? 100 : loadProgress) : 100;

  // Safety fallback slightly after the 2.0s GSAP camera dive in case WebGL is throttled
  useEffect(() => {
    if (phase !== "entering") return;
    const timer = window.setTimeout(finishIntroOnce, 2150);
    return () => window.clearTimeout(timer);
  }, [phase, finishIntroOnce]);

  const handleEnter = useCallback(() => {
    if (phase !== "ready") return;
    setPhase("entering");
  }, [phase]);

  const handleGpuReady = useCallback(() => {
    setGpuReady(true);
  }, []);

  const dismissSelection = useCallback(() => {
    setClearSignal((n) => n + 1);
  }, []);

  // Dismiss focused card cleanly on Escape
  useEffect(() => {
    if (!selectedItem) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismissSelection();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedItem, dismissSelection]);

  // Track pointer position relative to the hero stage (zero React re-renders)
  const updateStagePointer = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      pointerRef.current.x = e.clientX - rect.left;
      pointerRef.current.y = e.clientY - rect.top;
      pointerRef.current.containerWidth = rect.width;
      pointerRef.current.containerHeight = rect.height;
      pointerRef.current.isTouch = e.pointerType !== "mouse";
      pointerRef.current.initialized = true;
    },
    [],
  );

  useEffect(() => {
    if (!isVisible) return;

    let ticking = false;
    const handleScroll = () => {
      if (!containerRef.current) return;
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight || 1;
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
  }, [isVisible]);

  const isReady = phase === "ready";
  const isEntering = phase === "entering";
  const isComplete = phase === "complete";
  const isSceneRevealed = isEntering || isComplete;

  return (
    <div
      ref={containerRef}
      onPointerMove={updateStagePointer}
      onPointerEnter={updateStagePointer}
      onPointerDown={updateStagePointer}
      onPointerLeave={dismissSelection}
      className="absolute inset-0 w-full h-full will-change-[opacity]"
    >
      {/* Keep WebGL mounted for silent GPU shader warm-up, invisible until Enter Peak is clicked */}
      <div
        className={cn(
          "absolute inset-0 w-full h-full transition-opacity duration-1000 ease-out",
          isSceneRevealed
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        )}
      >
        <Scene isVisible={isVisible} onPointerMissed={dismissSelection}>
          {texturesReady && (
            <SphereGallery
              triggerIntro={isSceneRevealed}
              clearSignal={clearSignal}
              onSelectProject={setSelectedItem}
              onReady={handleGpuReady}
              onIntroComplete={finishIntroOnce}
            />
          )}
        </Scene>
      </div>

      {/* Backgroundless Fluid Snake Cursor / Touch Caption Overlay */}
      <GalleryCaptionOverlay
        selected={selectedItem}
        pointerRef={pointerRef}
        enabled={isComplete && isVisible}
      />

      {!isComplete && (
        <div
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center z-40 pb-24 md:pb-24",
            "transition-all duration-[1500ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
            isEntering
              ? "opacity-0 pointer-events-none scale-105 bg-transparent backdrop-blur-none"
              : isReady
                ? "opacity-100 bg-background/25 backdrop-blur-[2px]"
                : "opacity-100 bg-background/85 backdrop-blur-md",
          )}
        >
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
              <span className="text-xs md:text-sm font-bold tracking-[0.3em] uppercase text-primary mb-3 drop-shadow-md">
                Welcome to Animanga
              </span>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter uppercase text-foreground mb-5 drop-shadow-2xl">
                Your Universe <br className="hidden md:block" />
                <span className="text-foreground/70">Of Anime &amp; Manga</span>
              </h1>
              <p className="text-sm md:text-base lg:text-lg font-medium text-foreground/60 tracking-wide mb-8 md:mb-10 max-w-2xl leading-relaxed">
                Discover what&apos;s airing, find your next obsession, explore
                manga, meet the community, and experience the culture beyond the
                screen.
              </p>
            </div>

            <button
              type="button"
              onClick={handleEnter}
              disabled={!isReady || isEntering}
              className={cn(
                "group relative h-14 md:h-16 rounded-full transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                isEntering ? "opacity-0 scale-95" : "opacity-100 delay-150",
                isReady
                  ? "w-64 md:w-72 cursor-pointer border border-primary/50 bg-primary/20 text-foreground font-black tracking-[0.2em] uppercase text-sm md:text-base shadow-[0_0_30px_rgba(0,0,0,0.5)] hover:bg-primary/30 hover:scale-[1.02] hover:border-primary"
                  : "w-72 md:w-96 cursor-wait border border-border bg-accent",
              )}
            >
              <div
                className={cn(
                  "absolute inset-0 flex items-center justify-center transition-opacity duration-700",
                  isReady ? "opacity-100" : "opacity-0",
                )}
              >
                <span className="drop-shadow-md">View Scenes</span>
                <ArrowRight className="w-5 h-5 ml-3 transition-transform group-hover:translate-x-1" />
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-foreground/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
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
                  <div className="absolute top-0 right-0 bottom-0 w-12 bg-gradient-to-r from-transparent to-foreground/30 blur-[2px]" />
                </div>
                <div className="absolute inset-0 z-10 flex items-center justify-center gap-3 text-foreground/80 font-bold tracking-[0.2em] uppercase text-xs md:text-sm">
                  <span>Preparing Experience</span>
                  <span className="w-12 text-right tabular-nums">
                    {displayProgress}%
                  </span>
                </div>
              </div>
            </button>

            <div
              className={cn(
                "mt-5 text-[10px] md:text-xs font-bold tracking-[0.3em] uppercase transition-opacity duration-1000 flex items-center",
                isReady
                  ? "opacity-100 text-primary"
                  : "opacity-0 text-foreground/40",
              )}
            >
              <span
                className={cn(
                  "inline-block w-2 h-2 rounded-full mr-3",
                  isReady
                    ? "bg-primary animate-pulse shadow-[0_0_10px_currentColor]"
                    : "bg-foreground/20",
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
