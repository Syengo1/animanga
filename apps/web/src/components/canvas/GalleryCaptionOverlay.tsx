// C:\Projects\animanga-platform\apps\web\src\components\canvas\GalleryCaptionOverlay.tsx
"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ProjectData } from "@/lib/data";

export interface SelectedGalleryItem {
  project: ProjectData;
  index: number;
  total: number;
}

export interface GalleryPointerState {
  x: number;
  y: number;
  containerWidth: number;
  containerHeight: number;
  isTouch: boolean;
  initialized: boolean;
}

interface GalleryCaptionOverlayProps {
  selected: SelectedGalleryItem | null;
  pointerRef: React.RefObject<GalleryPointerState>;
  enabled: boolean;
}

interface TrailPoint {
  x: number;
  y: number;
}

interface CharLiveState {
  x: number;
  y: number;
  angle: number;
  scale: number;
  opacity: number;
}

interface MotionState {
  smoothVx: number;
  smoothVy: number;
  speed: number;
  heading: 1 | -1; // 1 = moving right (back end at cursor, left side), -1 = moving left (front end at cursor, right side)
  turnPhase: number; // Continuous 0 (right of cursor) <-> 1 (left of cursor)
  turnDir: 1 | -1; // Active direction of 180-deg rotation (+1: 0->1, -1: 1->0)
  snakeBlend: number; // 0 at rest -> 1 in liquid cursor-path motion
}

const CURSOR_CENTER_OFFSET_Y = 10; // Vertical center right at/below middle of the cursor
const CURSOR_SIDE_GAP_X = 16; // Compact tether gap between pointer and connected title end
const DESC_GAP_BELOW_TITLE_Y = 26;
const LOOP_ARCH_HEIGHT_Y = 30; // Compact in-place 180-deg overlapping loop height
const DESC_LOOP_ARCH_Y = 14; // Counter-arc so description flows cleanly beneath the loop
const LOOP_OVERLAY_STAGGER = 0.4; // Stagger so far end visibly sweeps over near end in a 180-deg loop
const MAX_TRAIL_POINTS = 160;
const MIN_TRAIL_STEP_PX = 1.5;
const MAX_LETTER_TILT_RAD = 0.34; // ~19.5 deg cap for readable liquid curvature
const DIR_SWITCH_SPEED_PX_S = 26;
const VIEWPORT_PAD = 22;
const RIVER_EASE = [0.22, 1, 0.36, 1] as const;

function easeInOutSine(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return 0.5 - 0.5 * Math.cos(Math.PI * c);
}

function clampAngle(rad: number): number {
  let normalized = rad;
  while (normalized > Math.PI) normalized -= Math.PI * 2;
  while (normalized < -Math.PI) normalized += Math.PI * 2;
  return Math.max(
    -MAX_LETTER_TILT_RAD,
    Math.min(MAX_LETTER_TILT_RAD, normalized),
  );
}

function lerpAngle(current: number, target: number, factor: number): number {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * factor;
}

function sampleTrailAtDistance(
  trail: TrailPoint[],
  targetDist: number,
  fallbackDirX: number,
): TrailPoint {
  if (trail.length === 0) return { x: 0, y: 0 };
  if (trail.length === 1 || targetDist <= 0) {
    return { x: trail[0].x, y: trail[0].y };
  }

  let acc = 0;
  for (let i = 0; i < trail.length - 1; i++) {
    const a = trail[i];
    const b = trail[i + 1];
    const segLen = Math.hypot(b.x - a.x, b.y - a.y);
    if (segLen < 0.0001) continue;

    if (acc + segLen >= targetDist) {
      const t = (targetDist - acc) / segLen;
      return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
      };
    }
    acc += segLen;
  }

  const last = trail[trail.length - 1];
  const prev = trail[trail.length - 2];
  const dx = last.x - prev.x;
  const dy = last.y - prev.y;
  const len = Math.hypot(dx, dy);
  const remain = targetDist - acc;

  if (len > 0.001) {
    return {
      x: last.x + (dx / len) * remain,
      y: last.y + (dy / len) * remain,
    };
  }

  return {
    x: last.x + fallbackDirX * remain,
    y: last.y,
  };
}

function buildSmoothSvgPath(points: TrailPoint[]): string {
  const n = points.length;
  if (n < 2) return "";

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  if (n === 2) {
    return `${d} L ${points[1].x.toFixed(1)} ${points[1].y.toFixed(1)}`;
  }

  for (let i = 1; i < n - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    const midX = (curr.x + next.x) * 0.5;
    const midY = (curr.y + next.y) * 0.5;
    d += ` Q ${curr.x.toFixed(1)} ${curr.y.toFixed(1)} ${midX.toFixed(1)} ${midY.toFixed(1)}`;
  }

  const tail = points[n - 1];
  return `${d} L ${tail.x.toFixed(1)} ${tail.y.toFixed(1)}`;
}

/**
 * Evaluates a letter along the in-place 180-deg overlapping loop around (anchorX, anchorY).
 * - phase = 0: front end (u=0) closest to cursor on right, back end (u=1) furthest right.
 * - phase = 1: back end (u=1) closest to cursor on left, front end (u=0) furthest left.
 * Mid-turn, the far end visibly arcs OVER the near end so they swap roles in place.
 */
function evalLetterInPlaceLoop(
  anchorX: number,
  anchorY: number,
  centerOffset: number,
  totalW: number,
  phase: number,
  u: number,
  turnDir: 1 | -1,
): { x: number; y: number; arcSin: number; overWeight: number } {
  const rawP = Math.max(
    0,
    Math.min(
      1,
      phase * (1 + LOOP_OVERLAY_STAGGER) - (1 - u) * LOOP_OVERLAY_STAGGER,
    ),
  );
  const easedP = easeInOutSine(rawP);
  const theta = Math.PI * easedP;
  const arcSin = Math.sin(theta);

  const orbitRx = CURSOR_SIDE_GAP_X + totalW * 0.5;
  const x = anchorX + orbitRx * Math.cos(theta) - totalW * 0.5 + centerOffset;

  // Far end swinging into the cursor takes the higher foreground arc (overWeight -> 1);
  // near end rotating out to become furthest takes the tighter lower arc (overWeight -> 0).
  const overWeight = turnDir > 0 ? u : 1 - u;
  const verticalLift = LOOP_ARCH_HEIGHT_Y * (0.4 + 0.8 * overWeight);
  const y = anchorY - verticalLift * arcSin;

  return { x, y, arcSin, overWeight };
}

function resolveTargetPhase(
  ptrX: number,
  containerWidth: number,
  blockW: number,
  heading: 1 | -1,
): number {
  const desiredPhase = heading === 1 ? 1 : 0;
  const fitsRight =
    ptrX + CURSOR_SIDE_GAP_X + blockW <= containerWidth - VIEWPORT_PAD;
  const fitsLeft = ptrX - CURSOR_SIDE_GAP_X - blockW >= VIEWPORT_PAD;

  if (desiredPhase === 0 && !fitsRight && fitsLeft) return 1;
  if (desiredPhase === 1 && !fitsLeft && fitsRight) return 0;
  return desiredPhase;
}

interface DesktopLiquidSnakeCaptionProps {
  item: SelectedGalleryItem;
  pointerRef: React.RefObject<GalleryPointerState>;
  trailRef: React.RefObject<TrailPoint[]>;
  motionRef: React.RefObject<MotionState>;
}

function DesktopLiquidSnakeCaption({
  item,
  pointerRef,
  trailRef,
  motionRef,
}: DesktopLiquidSnakeCaptionProps) {
  const uid = useId().replace(/:/g, "");
  const cursorGradId = `liquid-cursor-grad-${uid}`;
  const spineGradId = `liquid-spine-grad-${uid}`;

  const { title, description } = item.project.project.data;
  const chars = useMemo(() => Array.from(title), [title]);

  const charSpanRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const charCenterOffsetsRef = useRef<number[]>([]);
  const totalTitleWidthRef = useRef(120);
  const charLiveStatesRef = useRef<CharLiveState[]>([]);

  const descBoxRef = useRef<HTMLDivElement>(null);
  const descMetaRowRef = useRef<HTMLDivElement>(null);

  // Visible liquid path SVG refs (updated directly in rAF — zero React re-renders)
  const cursorGlowPathRef = useRef<SVGPathElement>(null);
  const cursorCorePathRef = useRef<SVGPathElement>(null);
  const letterLoopPathRef = useRef<SVGPathElement>(null);
  const cursorNodeRef = useRef<SVGCircleElement>(null);
  const cursorGradRef = useRef<SVGLinearGradientElement>(null);
  const spineGradRef = useRef<SVGLinearGradientElement>(null);

  // Measure exact unrotated character widths & seed new letters directly onto the live curve
  useLayoutEffect(() => {
    charSpanRefs.current.length = chars.length;

    const offsets: number[] = [];
    let cursorX = 0;

    for (let i = 0; i < chars.length; i++) {
      const span = charSpanRefs.current[i];
      const measuredW = span ? span.offsetWidth : 14;
      const w = Math.max(measuredW, chars[i] === " " ? 8 : 5);
      offsets.push(cursorX + w * 0.5);
      cursorX += w;
    }

    charCenterOffsetsRef.current = offsets;
    totalTitleWidthRef.current = Math.max(cursorX, 24);

    const ptr = pointerRef.current;
    const m = motionRef.current;
    if (!ptr || !m || !ptr.initialized || ptr.isTouch) return;

    const totalW = totalTitleWidthRef.current;
    const descH = descBoxRef.current?.offsetHeight || 84;
    const anchorX = Math.max(
      VIEWPORT_PAD,
      Math.min(ptr.containerWidth - VIEWPORT_PAD, ptr.x),
    );
    const anchorY = Math.max(
      VIEWPORT_PAD + LOOP_ARCH_HEIGHT_Y + 14,
      Math.min(
        ptr.containerHeight - DESC_GAP_BELOW_TITLE_Y - descH - VIEWPORT_PAD,
        ptr.y + CURSOR_CENTER_OFFSET_Y,
      ),
    );

    const nextLive: CharLiveState[] = new Array(chars.length);
    for (let i = 0; i < chars.length; i++) {
      const u = chars.length > 1 ? i / (chars.length - 1) : 0;
      const pt = evalLetterInPlaceLoop(
        anchorX,
        anchorY,
        offsets[i] ?? i * 14,
        totalW,
        m.turnPhase,
        u,
        m.turnDir,
      );
      nextLive[i] = { x: pt.x, y: pt.y, angle: 0, scale: 1, opacity: 1 };
      const span = charSpanRefs.current[i];
      if (span) {
        span.style.transform = `translate3d(${pt.x.toFixed(1)}px, ${pt.y.toFixed(1)}px, 0) translate(-50%, -50%) rotate(0rad) scale(1)`;
      }
    }
    charLiveStatesRef.current = nextLive;
  }, [chars, item.project.project.id, pointerRef, motionRef]);

  // Continuous 60/120FPS liquid snake path + visible SVG ribbon + in-place 180-deg overlapping loop
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const ptr = pointerRef.current;
      const trail = trailRef.current;
      const m = motionRef.current;

      if (ptr && trail && m && !ptr.isTouch && ptr.initialized) {
        const offsets = charCenterOffsetsRef.current;
        const totalW = totalTitleWidthRef.current;
        const descEl = descBoxRef.current;
        const descW = descEl?.offsetWidth || 320;
        const descH = descEl?.offsetHeight || 84;
        const blockW = Math.max(totalW, descW);

        // 1. Advance continuous 180-deg turnPhase (speed-coupled so rotation stays visible & fluid)
        const targetPhase = resolveTargetPhase(
          ptr.x,
          ptr.containerWidth,
          blockW,
          m.heading,
        );
        const diff = targetPhase - m.turnPhase;
        if (Math.abs(diff) > 0.001) {
          m.turnDir = diff > 0 ? 1 : -1;
        }
        const turnRate = 2.35 + Math.min(2.1, m.speed / 480);
        const maxStep = turnRate * dt;
        if (Math.abs(diff) <= maxStep) {
          m.turnPhase = targetPhase;
        } else {
          m.turnPhase += Math.sign(diff) * maxStep;
        }

        // Direct 1:1 cursor anchor — zero letters ever left behind
        const anchorX = Math.max(
          VIEWPORT_PAD,
          Math.min(ptr.containerWidth - VIEWPORT_PAD, ptr.x),
        );
        const anchorY = Math.max(
          VIEWPORT_PAD + LOOP_ARCH_HEIGHT_Y + 14,
          Math.min(
            ptr.containerHeight - DESC_GAP_BELOW_TITLE_Y - descH - VIEWPORT_PAD,
            ptr.y + CURSOR_CENTER_OFFSET_Y,
          ),
        );

        const phase = m.turnPhase;
        const turnDir = m.turnDir;
        const loopIntensity = Math.sin(Math.PI * phase); // 0 at rest on either side, 1 mid-180-deg turn
        const snakeWeight = m.snakeBlend * (1 - loopIntensity);
        const isRightAlignedSide = phase >= 0.5;
        const fallbackDirX = isRightAlignedSide ? -1 : 1;

        // 2. Compute liquid target for every letter:
        //    - Gliding steadily -> follows the EXACT recorded cursor path like a snake
        //    - Changing direction -> seamlessly arcs through the in-place 180-deg overlapping loop
        const targetPoints: Array<{
          x: number;
          y: number;
          scale: number;
          opacity: number;
          zIndex: number;
        }> = new Array(chars.length);

        for (let i = 0; i < chars.length; i++) {
          const u = chars.length > 1 ? i / (chars.length - 1) : 0;
          const centerOffset = offsets[i] ?? i * 14;

          const loopPt = evalLetterInPlaceLoop(
            anchorX,
            anchorY,
            centerOffset,
            totalW,
            phase,
            u,
            turnDir,
          );

          // Sample exact cursor path at this letter's distance from the connected cursor end
          const distFromCursor = isRightAlignedSide
            ? CURSOR_SIDE_GAP_X + Math.max(0, totalW - centerOffset)
            : CURSOR_SIDE_GAP_X + centerOffset;
          const pathPt = sampleTrailAtDistance(
            trail,
            distFromCursor,
            fallbackDirX,
          );

          // Gentle liquid ripple along the spine while flowing
          const waveRipple =
            Math.sin(now * 0.006 - distFromCursor * 0.032) * 1.8 * snakeWeight;

          const blendedX = loopPt.x + (pathPt.x - loopPt.x) * snakeWeight;
          const blendedY =
            loopPt.y + (pathPt.y - loopPt.y) * snakeWeight + waveRipple;

          // Subtle 3D overlap cue during the 180-deg rotation:
          // the end swinging OVER grows slightly & stays bright, the end pivoting UNDER tucks softly behind
          const depthBias = (loopPt.overWeight - 0.5) * 2; // -1..+1
          const scale = 1 + depthBias * 0.075 * loopPt.arcSin;
          const opacity = 1 - Math.max(0, -depthBias) * 0.28 * loopPt.arcSin;
          const zIndex = loopPt.arcSin > 0.08 ? (depthBias >= 0 ? 3 : 1) : 2;

          targetPoints[i] = {
            x: Math.max(
              VIEWPORT_PAD,
              Math.min(ptr.containerWidth - VIEWPORT_PAD, blendedX),
            ),
            y: Math.max(
              VIEWPORT_PAD,
              Math.min(ptr.containerHeight - VIEWPORT_PAD, blendedY),
            ),
            scale,
            opacity,
            zIndex,
          };
        }

        // 3. Apply tight liquid viscosity (high response = zero lag behind cursor, silky curves)
        const posFactor = 1 - Math.exp(-26 * dt);
        const rotFactor = 1 - Math.exp(-18 * dt);
        const liveStates = charLiveStatesRef.current;

        for (let i = 0; i < chars.length; i++) {
          const t = targetPoints[i];
          let st = liveStates[i];
          if (!st) {
            st = {
              x: t.x,
              y: t.y,
              angle: 0,
              scale: t.scale,
              opacity: t.opacity,
            };
            liveStates[i] = st;
          } else {
            st.x += (t.x - st.x) * posFactor;
            st.y += (t.y - st.y) * posFactor;
            st.scale += (t.scale - st.scale) * posFactor;
            st.opacity += (t.opacity - st.opacity) * posFactor;
          }
        }

        // 4. Compute tangent orientation along the live snake/loop & paint GPU transforms
        for (let i = 0; i < chars.length; i++) {
          const span = charSpanRefs.current[i];
          const st = liveStates[i];
          const tgt = targetPoints[i];
          if (!span || !st || !tgt) continue;

          const prevSt = liveStates[Math.max(0, i - 1)] ?? st;
          const nextSt = liveStates[Math.min(chars.length - 1, i + 1)] ?? st;
          const rdx = nextSt.x - prevSt.x;
          const rdy = nextSt.y - prevSt.y;
          const targetAngle =
            Math.hypot(rdx, rdy) > 1 ? clampAngle(Math.atan2(rdy, rdx)) : 0;

          st.angle = lerpAngle(st.angle, targetAngle, rotFactor);

          span.style.transform = `translate3d(${st.x.toFixed(1)}px, ${st.y.toFixed(1)}px, 0) translate(-50%, -50%) rotate(${st.angle.toFixed(3)}rad) scale(${st.scale.toFixed(3)})`;
          span.style.opacity = st.opacity.toFixed(2);
          span.style.zIndex = String(tgt.zIndex);
        }

        // 5. Render the VISIBLE liquid cursor path + live letter loop ribbon in SVG
        const visibleTrailPoints: TrailPoint[] = [];
        const maxVisibleTrailDist = Math.max(totalW + 96, 260);
        let walkedDist = 0;
        for (let i = 0; i < trail.length; i++) {
          visibleTrailPoints.push(trail[i]);
          if (i > 0) {
            walkedDist += Math.hypot(
              trail[i].x - trail[i - 1].x,
              trail[i].y - trail[i - 1].y,
            );
            if (walkedDist >= maxVisibleTrailDist) break;
          }
        }

        const trailD = buildSmoothSvgPath(visibleTrailPoints);
        const trailVisibility = Math.max(
          0.16,
          Math.min(0.68, m.snakeBlend * 0.62 + loopIntensity * 0.45),
        );

        if (cursorGradRef.current && visibleTrailPoints.length >= 2) {
          const head = visibleTrailPoints[0];
          const tail = visibleTrailPoints[visibleTrailPoints.length - 1];
          cursorGradRef.current.setAttribute("x1", head.x.toFixed(1));
          cursorGradRef.current.setAttribute("y1", head.y.toFixed(1));
          cursorGradRef.current.setAttribute("x2", tail.x.toFixed(1));
          cursorGradRef.current.setAttribute("y2", tail.y.toFixed(1));
        }

        if (cursorGlowPathRef.current) {
          cursorGlowPathRef.current.setAttribute("d", trailD);
          cursorGlowPathRef.current.style.opacity = (
            trailVisibility * 0.35
          ).toFixed(2);
        }

        if (cursorCorePathRef.current) {
          cursorCorePathRef.current.setAttribute("d", trailD);
          cursorCorePathRef.current.style.opacity = trailVisibility.toFixed(2);
        }

        // Thread a smooth visible ribbon from the cursor anchor through every live letter
        const spinePoints: TrailPoint[] = [{ x: anchorX, y: anchorY }];
        if (isRightAlignedSide) {
          for (let i = chars.length - 1; i >= 0; i--) {
            const st = liveStates[i];
            if (st) spinePoints.push({ x: st.x, y: st.y });
          }
        } else {
          for (let i = 0; i < chars.length; i++) {
            const st = liveStates[i];
            if (st) spinePoints.push({ x: st.x, y: st.y });
          }
        }

        const spineD = buildSmoothSvgPath(spinePoints);
        if (spineGradRef.current && spinePoints.length >= 2) {
          const head = spinePoints[0];
          const tail = spinePoints[spinePoints.length - 1];
          spineGradRef.current.setAttribute("x1", head.x.toFixed(1));
          spineGradRef.current.setAttribute("y1", head.y.toFixed(1));
          spineGradRef.current.setAttribute("x2", tail.x.toFixed(1));
          spineGradRef.current.setAttribute("y2", tail.y.toFixed(1));
        }

        if (letterLoopPathRef.current) {
          letterLoopPathRef.current.setAttribute("d", spineD);
          const spineOpacity =
            0.24 + m.snakeBlend * 0.22 + loopIntensity * 0.42;
          letterLoopPathRef.current.style.opacity = spineOpacity.toFixed(2);
        }

        if (cursorNodeRef.current) {
          cursorNodeRef.current.setAttribute("cx", anchorX.toFixed(1));
          cursorNodeRef.current.setAttribute("cy", anchorY.toFixed(1));
          cursorNodeRef.current.setAttribute(
            "r",
            (2.8 + loopIntensity * 1.4).toFixed(2),
          );
        }

        // 6. Synchronized Description riding smoothly underneath the title loop
        if (descEl) {
          const easedDesc = easeInOutSine(phase);
          const theta = Math.PI * easedDesc;
          const arcIntensity = Math.sin(theta);

          const isRightAligned = easedDesc >= 0.5;
          descEl.style.textAlign = isRightAligned ? "right" : "left";
          if (descMetaRowRef.current) {
            descMetaRowRef.current.style.justifyContent = isRightAligned
              ? "flex-end"
              : "flex-start";
          }

          const descRx = CURSOR_SIDE_GAP_X + descW * 0.5;
          const loopDescX = anchorX + descRx * Math.cos(theta) - descW * 0.5;

          // Subtle liquid follow along the cursor path beneath the title
          const descPathAnchor = sampleTrailAtDistance(
            trail,
            CURSOR_SIDE_GAP_X + Math.min(totalW * 0.35, 84),
            fallbackDirX,
          );
          const pathDescX = isRightAligned
            ? descPathAnchor.x - descW * 0.72
            : descPathAnchor.x - descW * 0.12;
          const rawDescX =
            loopDescX + (pathDescX - loopDescX) * snakeWeight * 0.45;

          const descX = Math.max(
            VIEWPORT_PAD,
            Math.min(ptr.containerWidth - descW - VIEWPORT_PAD, rawDescX),
          );

          const pathDescY = descPathAnchor.y + DESC_GAP_BELOW_TITLE_Y;
          const loopDescY =
            anchorY + DESC_GAP_BELOW_TITLE_Y + DESC_LOOP_ARCH_Y * arcIntensity;
          const rawDescY =
            loopDescY + (pathDescY - loopDescY) * snakeWeight * 0.45;

          const descY = Math.max(
            VIEWPORT_PAD + 28,
            Math.min(ptr.containerHeight - descH - VIEWPORT_PAD, rawDescY),
          );

          const descOpacity = 0.94 - arcIntensity * 0.22;
          descEl.style.transform = `translate3d(${descX.toFixed(1)}px, ${descY.toFixed(1)}px, 0)`;
          descEl.style.opacity = descOpacity.toFixed(2);
        }
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [chars.length, pointerRef, trailRef, motionRef]);

  return (
    <motion.div
      initial={{ opacity: 0, filter: "blur(6px)" }}
      animate={{
        opacity: 1,
        filter: "blur(0px)",
        transition: { duration: 0.32, ease: RIVER_EASE },
      }}
      exit={{
        opacity: 0,
        filter: "blur(6px)",
        transition: { duration: 0.4, ease: RIVER_EASE },
      }}
      className="hidden md:block absolute inset-0"
    >
      {/* Visible Liquid Path & 180-deg Overlapping Loop Ribbon */}
      <svg
        aria-hidden="true"
        className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
      >
        <defs>
          <linearGradient
            ref={cursorGradRef}
            id={cursorGradId}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.95" />
            <stop offset="55%" stopColor="var(--primary)" stopOpacity="0.45" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
          <linearGradient
            ref={spineGradRef}
            id={spineGradId}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.85" />
            <stop offset="70%" stopColor="var(--primary)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Soft luminous aura along exact cursor path */}
        <path
          ref={cursorGlowPathRef}
          fill="none"
          stroke={`url(#${cursorGradId})`}
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="blur-[4px]"
        />

        {/* Crisp liquid thread tracing the exact cursor path */}
        <path
          ref={cursorCorePathRef}
          fill="none"
          stroke={`url(#${cursorGradId})`}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Live letter-loop spline showing the 180-deg rotation & extension from cursor */}
        <path
          ref={letterLoopPathRef}
          fill="none"
          stroke={`url(#${spineGradId})`}
          strokeWidth="1.4"
          strokeDasharray="3 3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Cursor tether anchor point */}
        <circle
          ref={cursorNodeRef}
          cx="0"
          cy="0"
          r="2.8"
          fill="var(--primary)"
          className="opacity-85 drop-shadow-[0_0_8px_var(--primary)]"
        />
      </svg>

      {/* Individual Title Letters Flowing Like a Liquid Snake & Rotating 180-deg In Place */}
      <div aria-label={title} className="absolute inset-0">
        {chars.map((char, i) => (
          <span
            key={`${item.project.project.id}-${i}`}
            ref={(el) => {
              charSpanRefs.current[i] = el;
            }}
            aria-hidden="true"
            className="absolute top-0 left-0 inline-block whitespace-pre font-display text-2xl lg:text-3xl font-black tracking-tight text-foreground leading-none will-change-transform drop-shadow-[0_2px_18px_var(--background)]"
          >
            {char === " " ? "\u00A0" : char}
          </span>
        ))}
      </div>

      {/* Synchronized Description Riding Directly Below the Liquid Title Loop */}
      <div
        ref={descBoxRef}
        className="absolute top-0 left-0 w-[320px] max-w-[calc(100vw-48px)] will-change-transform"
      >
        <div ref={descMetaRowRef} className="flex items-center gap-2 mb-1.5">
          <span className="h-[1.5px] w-4 bg-primary shadow-[0_0_8px_var(--primary)]" />
          <span className="text-[10px] font-mono font-bold tracking-[0.26em] uppercase text-primary drop-shadow-[0_2px_10px_var(--background)]">
            {String(item.index + 1).padStart(2, "0")} /{" "}
            {String(item.total).padStart(2, "0")}
          </span>
        </div>
        <p className="text-xs lg:text-sm font-medium text-foreground/85 leading-relaxed drop-shadow-[0_2px_14px_var(--background)]">
          {description}
        </p>
      </div>
    </motion.div>
  );
}

export default function GalleryCaptionOverlay({
  selected,
  pointerRef,
  enabled,
}: GalleryCaptionOverlayProps) {
  const trailRef = useRef<TrailPoint[]>([]);
  const motionRef = useRef<MotionState>({
    smoothVx: 0,
    smoothVy: 0,
    speed: 0,
    heading: -1, // Default: front-connected on the right of the cursor
    turnPhase: 0,
    turnDir: -1,
    snakeBlend: 0,
  });

  // Continuously record exact cursor path + velocity so picking up a card flows immediately
  useEffect(() => {
    if (!enabled) return;

    let rafId = 0;
    let lastTime = performance.now();
    let prevX = 0;
    let prevY = 0;
    let hasPrev = false;

    const recordMotion = (now: number) => {
      const dt = Math.max(0.001, Math.min((now - lastTime) / 1000, 0.05));
      lastTime = now;

      const ptr = pointerRef.current;
      const m = motionRef.current;

      if (ptr && !ptr.isTouch && ptr.initialized) {
        const headX = ptr.x;
        const headY = ptr.y + CURSOR_CENTER_OFFSET_Y;

        if (!hasPrev) {
          prevX = headX;
          prevY = headY;
          hasPrev = true;
          trailRef.current = [{ x: headX, y: headY }];
        } else {
          const instVx = (headX - prevX) / dt;
          const instVy = (headY - prevY) / dt;
          prevX = headX;
          prevY = headY;

          const velFactor = 1 - Math.exp(-13 * dt);
          m.smoothVx += (instVx - m.smoothVx) * velFactor;
          m.smoothVy += (instVy - m.smoothVy) * velFactor;
          m.speed = Math.hypot(m.smoothVx, m.smoothVy);

          if (m.smoothVx > DIR_SWITCH_SPEED_PX_S) {
            m.heading = 1;
          } else if (m.smoothVx < -DIR_SWITCH_SPEED_PX_S) {
            m.heading = -1;
          }

          // Smoothly engage exact-path snake flow in motion and relax cleanly into alignment at rest
          const targetSnake =
            m.speed > 36 ? 1 : m.speed < 10 ? 0 : (m.speed - 10) / 26;
          const blendLambda = targetSnake > m.snakeBlend ? 7.5 : 3.2;
          m.snakeBlend +=
            (targetSnake - m.snakeBlend) * (1 - Math.exp(-blendLambda * dt));

          const trail = trailRef.current;
          if (trail.length === 0) {
            trail.push({ x: headX, y: headY });
          } else {
            const distFromHead = Math.hypot(
              headX - trail[0].x,
              headY - trail[0].y,
            );
            if (distFromHead >= MIN_TRAIL_STEP_PX) {
              trail.unshift({ x: headX, y: headY });
              if (trail.length > MAX_TRAIL_POINTS) {
                trail.length = MAX_TRAIL_POINTS;
              }
            } else if (m.speed < 10 && trail.length > 2) {
              // Gently retract the visible cursor tail as the pointer settles to a stop
              trail.pop();
            }
          }
        }
      }

      rafId = window.requestAnimationFrame(recordMotion);
    };

    rafId = window.requestAnimationFrame(recordMotion);
    return () => window.cancelAnimationFrame(rafId);
  }, [enabled, pointerRef]);

  const activeItem = enabled ? selected : null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none absolute inset-0 z-30 overflow-hidden select-none"
    >
      {/* Desktop: Visible Liquid Cursor Path + Exact Snake Flow + In-Place 180-deg Overlapping Loop */}
      <AnimatePresence>
        {activeItem && (
          <DesktopLiquidSnakeCaption
            key="desktop-liquid-snake"
            item={activeItem}
            pointerRef={pointerRef}
            trailRef={trailRef}
            motionRef={motionRef}
          />
        )}
      </AnimatePresence>

      {/* Mobile / Touch: Clean Backgroundless Lower-Third Typography Above ScrollIndicator */}
      <div className="md:hidden absolute inset-x-5 bottom-28">
        <div className="relative w-full">
          <AnimatePresence initial={false}>
            {activeItem && (
              <motion.div
                key={activeItem.project.project.id}
                initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
                animate={{
                  opacity: 1,
                  y: 0,
                  filter: "blur(0px)",
                  transition: { duration: 0.65, ease: RIVER_EASE },
                }}
                exit={{
                  opacity: 0,
                  y: -10,
                  filter: "blur(6px)",
                  transition: { duration: 0.45, ease: RIVER_EASE },
                }}
                className="absolute inset-x-0 bottom-0 flex flex-col items-start text-left break-words"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="h-[1.5px] w-5 bg-primary shadow-[0_0_8px_var(--primary)]" />
                  <span className="text-[10px] font-mono font-bold tracking-[0.25em] uppercase text-primary drop-shadow-[0_2px_10px_var(--background)]">
                    {String(activeItem.index + 1).padStart(2, "0")} /{" "}
                    {String(activeItem.total).padStart(2, "0")}
                  </span>
                </div>

                <h2 className="font-display text-2xl font-black tracking-tight text-foreground leading-tight drop-shadow-[0_2px_18px_var(--background)]">
                  {activeItem.project.project.data.title}
                </h2>

                <p className="mt-1.5 max-w-sm text-xs font-medium text-foreground/85 leading-relaxed drop-shadow-[0_2px_14px_var(--background)]">
                  {activeItem.project.project.data.description}
                </p>

                <span className="mt-2.5 text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55 drop-shadow-[0_1px_8px_var(--background)]">
                  Tap anywhere or swipe to continue
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
