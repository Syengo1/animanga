"use client";

import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";

export default function ScrollIndicator() {
  const [status, setStatus] = useState<"idle" | "holding" | "ready">("idle");
  const [activeBoundary, setActiveBoundary] = useState<
    "bottom" | "top" | "none"
  >("none");

  // 1. Use a ref to manipulate the SVG directly, bypassing React render cycles for 60FPS mobile performance
  const circleRef = useRef<SVGCircleElement>(null);

  const radius = 14;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    const handleOverscroll = (e: CustomEvent) => {
      const { intentProgress, boundary, ready } = e.detail;

      setActiveBoundary(boundary);

      // 2. Direct DOM mutation for the progress ring
      if (circleRef.current) {
        const offset = circumference - intentProgress * circumference;
        circleRef.current.style.strokeDashoffset = `${offset}`;

        // CRITICAL FIX: Only apply a CSS transition when resetting to 0.
        // Applying a transition while `useFrame` pushes 60 updates/sec causes severe stuttering.
        circleRef.current.style.transition =
          intentProgress === 0 ? "stroke-dashoffset 0.3s ease-out" : "none";
      }

      if (boundary === "none") {
        setStatus("idle");
        return;
      }

      if (ready) {
        setStatus("ready");
      } else if (intentProgress > 0) {
        setStatus("holding");
      } else {
        setStatus("idle");
      }
    };

    window.addEventListener(
      "gallery-overscroll",
      handleOverscroll as EventListener,
    );
    return () => {
      window.removeEventListener(
        "gallery-overscroll",
        handleOverscroll as EventListener,
      );
    };
  }, [circumference]);

  if (activeBoundary === "top") return null;

  return (
    // Elevated Z-index to 50 to ensure it isn't masked by surrounding overlays
    <div className="absolute bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex flex-col items-center transition-all duration-300">
      <span
        className={cn(
          "text-xs tracking-[0.3em] uppercase mb-4 transition-all duration-300 font-bold",
          status === "idle" && "text-white/50 animate-bounce",
          status === "holding" && "text-white/90 scale-105",
          status === "ready" &&
            "text-primary scale-110 drop-shadow-[0_0_8px_rgba(var(--primary),0.8)]",
        )}
      >
        {status === "idle" && "SCROLL"}
        {status === "holding" && "HOLD TO SCROLL"}
        {status === "ready" && "CONTINUING..."}
      </span>

      <div
        className="relative flex items-center justify-center transition-opacity duration-300"
        style={{ opacity: status === "idle" ? 0.3 : 1 }}
      >
        <svg width="40" height="40" className="transform -rotate-90">
          <circle
            cx="20"
            cy="20"
            r={radius}
            stroke="currentColor"
            strokeWidth="2"
            fill="transparent"
            className="text-white/20"
          />
          <circle
            ref={circleRef}
            cx="20"
            cy="20"
            r={radius}
            stroke="currentColor"
            strokeWidth="2"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={circumference}
            // Removed Tailwind's "transition-all ease-linear" to stop 60FPS CSS transition fighting
            className="text-primary"
          />
        </svg>
        <div className="absolute w-2 h-2 border-b-2 border-r-2 border-current transform rotate-45 mt-[-2px] text-white/70" />
      </div>
    </div>
  );
}
