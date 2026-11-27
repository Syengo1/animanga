// C:\Projects\animanga-platform\apps\web\src\components\canvas\ScrollIndicator.tsx
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

const RADIUS = 14;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const HOLD_DURATION_MS = 360; // Rejects accidental light taps & grazes while feeling snappy on intent
const MAX_DRIFT_PX = 12; // Cancels immediately if finger drags/swipes across the arrow
const SCROLL_COOLDOWN_MS = 900;
const NAVBAR_HEIGHT_PX = 64;

export default function ScrollIndicator() {
  const [status, setStatus] = useState<"idle" | "holding" | "ready">("idle");
  const [activeBoundary, setActiveBoundary] = useState<
    "bottom" | "top" | "none"
  >("none");
  const [nudgeHold, setNudgeHold] = useState(false);

  const circleRef = useRef<SVGCircleElement>(null);
  const isButtonHoldingRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const holdStartTimeRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);
  const cooldownRef = useRef(false);
  const resetTimerRef = useRef<number | null>(null);
  const nudgeTimerRef = useRef<number | null>(null);

  const setRingProgress = useCallback((progress: number, animate = false) => {
    const circle = circleRef.current;
    if (!circle) return;
    const clamped = Math.max(0, Math.min(1, progress));
    circle.style.strokeDashoffset = `${CIRCUMFERENCE - clamped * CIRCUMFERENCE}`;
    circle.style.transition = animate
      ? "stroke-dashoffset 0.25s ease-out"
      : "none";
  }, []);

  const stopHoldLoop = useCallback(() => {
    if (rafIdRef.current !== null) {
      window.cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, []);

  const executeForceScroll = useCallback(() => {
    if (cooldownRef.current) return;
    cooldownRef.current = true;
    isButtonHoldingRef.current = false;
    activePointerIdRef.current = null;
    startPointRef.current = null;
    stopHoldLoop();

    setRingProgress(1, false);
    setNudgeHold(false);
    setStatus("ready");

    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(14);
      } catch {
        // Ignore browsers blocking haptic vibration
      }
    }

    const trendingEl = document.getElementById("trending-section");
    if (trendingEl) {
      const targetTop = Math.max(
        0,
        trendingEl.getBoundingClientRect().top +
          window.scrollY -
          NAVBAR_HEIGHT_PX,
      );
      window.scrollTo({ top: targetTop, behavior: "smooth" });
    } else {
      window.scrollTo({ top: window.innerHeight, behavior: "smooth" });
    }

    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
    }
    resetTimerRef.current = window.setTimeout(() => {
      cooldownRef.current = false;
      setStatus("idle");
      setRingProgress(0, true);
    }, SCROLL_COOLDOWN_MS);
  }, [setRingProgress, stopHoldLoop]);

  const cancelButtonHold = useCallback(
    (showBriefNudge = false) => {
      if (!isButtonHoldingRef.current) return;
      isButtonHoldingRef.current = false;
      activePointerIdRef.current = null;
      startPointRef.current = null;
      stopHoldLoop();

      if (!cooldownRef.current) {
        setStatus("idle");
        setRingProgress(0, true);
      }

      if (showBriefNudge) {
        setNudgeHold(true);
        if (nudgeTimerRef.current !== null) {
          window.clearTimeout(nudgeTimerRef.current);
        }
        nudgeTimerRef.current = window.setTimeout(() => {
          setNudgeHold(false);
        }, 1200);
      }
    },
    [setRingProgress, stopHoldLoop],
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    // Reject secondary touches, palm contacts, or non-primary mouse buttons
    if (!e.isPrimary) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (cooldownRef.current) return;

    // Prevent CameraController from capturing this intentional button press
    e.stopPropagation();

    isButtonHoldingRef.current = true;
    activePointerIdRef.current = e.pointerId;
    startPointRef.current = { x: e.clientX, y: e.clientY };
    holdStartTimeRef.current = performance.now();
    setNudgeHold(false);
    setStatus("holding");

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore capture errors on synthetic events
    }

    const tick = (now: number) => {
      if (!isButtonHoldingRef.current) return;
      const elapsed = now - holdStartTimeRef.current;
      const progress = Math.min(1, elapsed / HOLD_DURATION_MS);
      setRingProgress(progress, false);

      if (progress >= 1) {
        executeForceScroll();
        return;
      }

      rafIdRef.current = window.requestAnimationFrame(tick);
    };

    stopHoldLoop();
    rafIdRef.current = window.requestAnimationFrame(tick);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (
      !isButtonHoldingRef.current ||
      activePointerIdRef.current !== e.pointerId
    ) {
      return;
    }
    const start = startPointRef.current;
    if (!start) return;

    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    // Cancel immediately if the user is dragging or brushing across the screen
    if (Math.hypot(dx, dy) > MAX_DRIFT_PX) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore if already released
      }
      cancelButtonHold(false);
    }
  };

  const handlePointerEnd = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    const elapsed = performance.now() - holdStartTimeRef.current;

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore if already released
    }

    // Only show a gentle nudge on an intentional short tap (70ms–359ms), not a fleeting <70ms brush
    const wasIntentionalShortTap = elapsed >= 70 && elapsed < HOLD_DURATION_MS;
    cancelButtonHold(wasIntentionalShortTap);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      executeForceScroll();
    }
  };

  // Sync with CameraController's overscroll gesture when the button itself isn't being held
  useEffect(() => {
    const handleOverscroll = (e: Event) => {
      if (isButtonHoldingRef.current || cooldownRef.current) return;
      const custom = e as CustomEvent<{
        intentProgress: number;
        boundary: "bottom" | "top" | "none";
        ready: boolean;
      }>;
      const { intentProgress, boundary, ready } = custom.detail;

      setActiveBoundary(boundary);
      setRingProgress(intentProgress, intentProgress === 0);

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

    window.addEventListener("gallery-overscroll", handleOverscroll);
    return () => {
      window.removeEventListener("gallery-overscroll", handleOverscroll);
      stopHoldLoop();
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }
      if (nudgeTimerRef.current !== null) {
        window.clearTimeout(nudgeTimerRef.current);
      }
    };
  }, [setRingProgress, stopHoldLoop]);

  if (activeBoundary === "top") return null;

  return (
    <div className="absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] md:bottom-7 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex flex-col items-center transition-all duration-300">
      <span
        className={cn(
          "text-[11px] sm:text-xs tracking-[0.28em] uppercase mb-2.5 transition-all duration-300 font-bold whitespace-nowrap select-none",
          status === "idle" &&
            !nudgeHold &&
            "text-foreground/60 animate-bounce",
          (status === "holding" || nudgeHold) && "text-foreground/95 scale-105",
          status === "ready" &&
            "text-primary scale-110 drop-shadow-[0_0_10px_var(--primary)]",
        )}
      >
        {status === "ready"
          ? "CONTINUING..."
          : status === "holding" || nudgeHold
            ? "HOLD TO SCROLL"
            : "SCROLL"}
      </span>

      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onLostPointerCapture={() => cancelButtonHold(false)}
        onKeyDown={handleKeyDown}
        onContextMenu={(e) => e.preventDefault()}
        aria-label="Press and hold to scroll down to trending catalog"
        title="Hold to scroll down"
        className={cn(
          "pointer-events-auto relative size-12 rounded-full flex items-center justify-center touch-none select-none cursor-pointer transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          status === "idle"
            ? "bg-card/30 hover:bg-card/60 backdrop-blur-sm opacity-75 hover:opacity-100"
            : "bg-card/70 backdrop-blur-md opacity-100 scale-105 shadow-lg",
        )}
      >
        <svg
          width="40"
          height="40"
          className="transform -rotate-90 pointer-events-none"
        >
          <circle
            cx="20"
            cy="20"
            r={RADIUS}
            stroke="currentColor"
            strokeWidth="2"
            fill="transparent"
            className="text-foreground/25"
          />
          <circle
            ref={circleRef}
            cx="20"
            cy="20"
            r={RADIUS}
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            fill="transparent"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE}
            className="text-primary"
          />
        </svg>
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute w-2 h-2 border-b-2 border-r-2 border-current transform rotate-45 -mt-0.5 transition-colors",
            status === "idle" ? "text-foreground/80" : "text-primary",
          )}
        />
      </button>
    </div>
  );
}
