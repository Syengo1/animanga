"use client";

import { useState, useEffect, useRef } from "react";
import Scene from "@/components/canvas/Scene";
import SphereGallery from "@/components/canvas/SphereGallery";

interface InteractiveSphereGalleryProps {
  onIntroComplete?: () => void;
}

export default function InteractiveSphereGallery({
  onIntroComplete,
}: InteractiveSphereGalleryProps) {
  const [introCompleted, setIntroCompleted] = useState(false);
  const [, setSelectedProjectId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleEnter = () => {
    setIntroCompleted(true);
    // Optional: We can delay the parent notification by 2s if the parent UI
    // shouldn't show up until the dive is finished.
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
        {/* Gallery is pre-mounted to compile shaders, but hidden until triggered */}
        <SphereGallery
          onSelectProject={setSelectedProjectId}
          triggerIntro={introCompleted}
        />
      </Scene>

      {!introCompleted && (
        <div
          onClick={handleEnter}
          className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-[999] cursor-pointer group"
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
      )}
    </div>
  );
}
