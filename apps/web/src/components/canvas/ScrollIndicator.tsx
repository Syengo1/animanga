"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export default function ScrollIndicator() {
  const [status, setStatus] = useState<"idle" | "holding" | "ready">("idle");
  const [intentProg, setIntentProg] = useState(0);
  const [activeBoundary, setActiveBoundary] = useState<
    "bottom" | "top" | "none"
  >("none");

  useEffect(() => {
    const handleOverscroll = (e: CustomEvent) => {
      const { intentProgress, boundary, ready } = e.detail;

      setActiveBoundary(boundary);
      setIntentProg(intentProgress);

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
  }, []);

  if (activeBoundary === "top") return null;

  // Circular progress calculations
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - intentProg * circumference;

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 pointer-events-none flex flex-col items-center transition-all duration-300">
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

      {/* Circular Timer Ring */}
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
            cx="20"
            cy="20"
            r={radius}
            stroke="currentColor"
            strokeWidth="2"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="text-primary transition-all ease-linear"
            style={{ transitionDuration: intentProg === 0 ? "0ms" : "50ms" }}
          />
        </svg>
        {/* Subtle chevron indicating downward direction */}
        <div className="absolute w-2 h-2 border-b-2 border-r-2 border-current transform rotate-45 mt-[-2px] text-white/70" />
      </div>
    </div>
  );
}
