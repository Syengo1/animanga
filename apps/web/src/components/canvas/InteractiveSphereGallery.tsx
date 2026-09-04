"use client";

import { useState, useEffect, useRef, startTransition } from "react";
import Scene from "@/components/canvas/Scene";
import SphereGallery from "@/components/canvas/SphereGallery";

interface InteractiveSphereGalleryProps {
  onIntroComplete?: () => void;
}

export default function InteractiveSphereGallery({
  onIntroComplete,
}: InteractiveSphereGalleryProps) {
  const [introCompleted, setIntroCompleted] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  const [, setSelectedProjectId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleEnter = () => {
    if (isEntering) return;

    // 1. Immediate UI feedback: Triggers the CSS cross-fade instantly
    setIsEntering(true);

    // 2. Defer the heavy 3D reconciliation so it doesn't block the click paint
    startTransition(() => {
      setIntroCompleted(true);
    });

    if (onIntroComplete) {
      setTimeout(onIntroComplete, 2000);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const opacity = Math.max(1 - scrollY / (windowHeight * 0.8), 0);
      containerRef.current.style.opacity = opacity.toString();
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full will-change-[opacity]"
    >
      <Scene>
        <SphereGallery
          onSelectProject={setSelectedProjectId}
          triggerIntro={introCompleted}
        />
      </Scene>

      {/* 
        CRITICAL FIX: The overlay remains mounted. We use CSS transitions to fade it 
        out and scale it up, perfectly masking the 3D gallery's opacity fade-in.
      */}
      <div
        onClick={handleEnter}
        className={`absolute inset-0 flex flex-col items-center justify-center z-[999] transition-all duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isEntering
            ? "opacity-0 pointer-events-none scale-105 bg-black/0 backdrop-blur-none"
            : "opacity-100 cursor-pointer group bg-black/60 backdrop-blur-sm"
        }`}
      >
        <div className="inline-flex px-12 py-8 uppercase text-primary/80 border border-primary/20 bg-primary/5 rounded-2xl text-sm tracking-[0.3em] flex-col items-center pointer-events-none text-center transition-all duration-500 group-hover:bg-primary/10 group-hover:scale-105 group-hover:border-primary/50">
          <span className="relative z-20 font-black mb-2 animate-pulse text-primary">
            Enter the Void
          </span>
          <span className="relative z-20 text-xs text-white/60">
            Initialize 3D Experience
          </span>
        </div>
      </div>
    </div>
  );
}
