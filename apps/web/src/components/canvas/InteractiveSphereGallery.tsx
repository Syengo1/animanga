"use client";

import { useState, useEffect, useRef } from "react";
import { useProgress } from "@react-three/drei";
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

  // 1. Hook into WebGL's asset loading pipeline
  const { progress } = useProgress();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (progress === 100) {
      // Buy 800ms for the GPU to decode AVIFs and upload to VRAM after network finishes
      const timer = setTimeout(() => setIsReady(true), 800);
      return () => clearTimeout(timer);
    }
    setIsReady(false);
  }, [progress]);

  const handleEnter = () => {
    // 2. Prevent clicking if textures are still downloading OR compiling
    if (isEntering || !isReady) return;

    // Immediate UI feedback
    setIsEntering(true);
    setIntroCompleted(true);

    if (onIntroComplete) {
      setTimeout(onIntroComplete, 2000);
    }
  };

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!containerRef.current) return;

      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const opacity = Math.max(1 - scrollY / (windowHeight * 0.8), 0);

      // 4. Wrap DOM mutation in requestAnimationFrame to prevent layout thrashing on mobile
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
        The overlay remains mounted. We use CSS transitions to fade it 
        out and scale it up, perfectly masking the 3D gallery's opacity fade-in.
      */}
      <div
        onClick={handleEnter}
        className={`absolute inset-0 flex flex-col items-center justify-center z-[999] transition-all duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isEntering
            ? "opacity-0 pointer-events-none scale-105 bg-black/0 backdrop-blur-none"
            : isReady
              ? "opacity-100 cursor-pointer group bg-black/60 backdrop-blur-sm"
              : "opacity-100 cursor-wait bg-black/80 backdrop-blur-md"
        }`}
      >
        <div
          className={`inline-flex px-12 py-8 uppercase text-primary/80 border bg-primary/5 rounded-2xl text-sm tracking-[0.3em] flex-col items-center pointer-events-none text-center transition-all duration-500 ${
            isReady
              ? "border-primary/20 group-hover:bg-primary/10 group-hover:scale-105 group-hover:border-primary/50"
              : "border-primary/10 opacity-70"
          }`}
        >
          <span
            className={`relative z-20 font-black mb-2 text-primary ${isReady ? "animate-pulse" : ""}`}
          >
            {isReady
              ? "Enter the Void"
              : // Cap at 99% during the 800ms GPU compilation buffer
                `Loading Core Systems... ${Math.min(Math.round(progress), 99)}%`}
          </span>
          <span className="relative z-20 text-xs text-white/60">
            {isReady
              ? "Initialize 3D Experience"
              : "Downloading high-resolution textures"}
          </span>
        </div>
      </div>
    </div>
  );
}
