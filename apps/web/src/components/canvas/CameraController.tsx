// C:\Projects\animanga-platform\apps\web\src\components\canvas\CameraController.tsx
import { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface CameraControllerProps {
  introCompleted: boolean;
  topBoundary?: number;
  bottomBoundary?: number;
  galleryRadius?: number;
  isFocused?: boolean;
  onDraggingChange?: (dragging: boolean) => void;
  onDragStart?: () => void;
}

const DRAG_THRESHOLD_PX = 10;
const NAVBAR_HEIGHT_PX = 64;

function dispatchGalleryState(
  intentProgress: number,
  boundary: "none" | "top" | "bottom",
  ready = false,
) {
  window.dispatchEvent(
    new CustomEvent("gallery-overscroll", {
      detail: { intentProgress, boundary, ready },
    }),
  );
}

export default function CameraController({
  introCompleted,
  topBoundary = 0,
  bottomBoundary = 0,
  galleryRadius = 2500,
  isFocused = false,
  onDraggingChange,
  onDragStart,
}: CameraControllerProps) {
  const { get, size } = useThree();
  const isMobile = size.width < 768;

  // Immortal Physics State
  const isDragging = useRef(false);
  const hasExceededDragThreshold = useRef(false);
  const isExitingGallery = useRef(false);
  const activePointerId = useRef<number | null>(null);
  const isFocusedRef = useRef(isFocused);
  const currentLambda = useRef(1.65);
  const exitResetTimerRef = useRef<number | null>(null);

  const onDraggingChangeRef = useRef(onDraggingChange);
  const onDragStartRef = useRef(onDragStart);

  useEffect(() => {
    isFocusedRef.current = isFocused;
  }, [isFocused]);

  useEffect(() => {
    onDraggingChangeRef.current = onDraggingChange;
    onDragStartRef.current = onDragStart;
  }, [onDraggingChange, onDragStart]);

  useEffect(() => {
    return () => {
      if (exitResetTimerRef.current !== null) {
        window.clearTimeout(exitResetTimerRef.current);
      }
    };
  }, []);

  const pointer = useRef({
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    vX: 0,
    vY: 0,
  });
  const targets = useRef({ rotY: 0, posY: 0 });
  const bounds = useRef({
    minCameraY: 0,
    maxCameraY: 0,
    hLimit: 0,
    visibleHalfHeight: 0,
  });
  const viewport = useRef({ w: 1, h: 1 });

  const overscrollY = useRef(0);
  const isHoldingToContinue = useRef(false);
  const holdStartTime = useRef<number | null>(null);
  const boundaryState = useRef<"none" | "top" | "bottom">("none");

  useEffect(() => {
    if (!introCompleted) return;
    const camera = get().camera as THREE.PerspectiveCamera;
    viewport.current.w = size.width;
    viewport.current.h = size.height;

    const fovRad = THREE.MathUtils.degToRad(camera.fov);
    const hFovDeg = THREE.MathUtils.radToDeg(
      2 * Math.atan(Math.tan(fovRad / 2) * camera.aspect),
    );
    bounds.current.hLimit = THREE.MathUtils.degToRad(
      135 - hFovDeg / (isMobile ? 8 : 2),
    );
    bounds.current.visibleHalfHeight = Math.tan(fovRad / 2) * galleryRadius;

    const pad = isMobile ? 200 : 300;
    let max = topBoundary - bounds.current.visibleHalfHeight + pad;
    let min = bottomBoundary + bounds.current.visibleHalfHeight - pad;
    if (min > max) {
      max = min = (topBoundary + bottomBoundary) / 2;
    }

    bounds.current.maxCameraY = max;
    bounds.current.minCameraY = min;

    if (targets.current.rotY === 0 && targets.current.posY === 0) {
      targets.current.rotY = camera.rotation.y;
      targets.current.posY = camera.position.y;
    }
  }, [
    get,
    introCompleted,
    size.width,
    size.height,
    topBoundary,
    bottomBoundary,
    galleryRadius,
    isMobile,
  ]);

  useEffect(() => {
    if (!introCompleted) return;
    const { camera, gl } = get();
    const canvasEl = gl.domElement;
    const prevTouchAction = canvasEl.style.touchAction;

    const handlePointerDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      isDragging.current = true;
      hasExceededDragThreshold.current = false;
      activePointerId.current = e.pointerId;
      pointer.current.startX = e.clientX;
      pointer.current.startY = e.clientY;
      pointer.current.lastX = e.clientX;
      pointer.current.lastY = e.clientY;
      pointer.current.vX = 0;
      pointer.current.vY = 0;
      overscrollY.current = 0;
      isHoldingToContinue.current = false;
      holdStartTime.current = null;
      boundaryState.current = "none";
      targets.current.rotY = camera.rotation.y;
      targets.current.posY = camera.position.y;
      if (e.pointerType !== "mouse") {
        try {
          canvasEl.setPointerCapture(e.pointerId);
        } catch {
          // Ignore pointer capture errors on synthetic events
        }
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      // Fluid mouse-linked camera exploration on desktop
      if (e.pointerType === "mouse" && !isDragging.current) {
        const ndcX = (e.clientX / viewport.current.w) * 2 - 1;
        const ndcY = -(e.clientY / viewport.current.h) * 2 + 1;
        targets.current.posY = THREE.MathUtils.mapLinear(
          ndcY,
          -1,
          1,
          bounds.current.minCameraY,
          bounds.current.maxCameraY,
        );
        targets.current.rotY = -ndcX * bounds.current.hLimit;
        return;
      }

      if (!isDragging.current) return;

      const deltaX = e.clientX - pointer.current.lastX;
      const deltaY = e.clientY - pointer.current.lastY;
      const totalDist = Math.hypot(
        e.clientX - pointer.current.startX,
        e.clientY - pointer.current.startY,
      );

      if (!hasExceededDragThreshold.current && totalDist > DRAG_THRESHOLD_PX) {
        hasExceededDragThreshold.current = true;
        onDraggingChangeRef.current?.(true);
        onDragStartRef.current?.();
      }

      // Smooth velocity tracking for natural release coasting
      pointer.current.vX = pointer.current.vX * 0.45 + deltaX * 0.55;
      pointer.current.vY = pointer.current.vY * 0.45 + deltaY * 0.55;
      pointer.current.lastX = e.clientX;
      pointer.current.lastY = e.clientY;

      targets.current.rotY += (deltaX / viewport.current.w) * Math.PI * 1.35;
      const intendedPosY =
        targets.current.posY +
        (deltaY / viewport.current.h) *
          (bounds.current.visibleHalfHeight * 1.85);

      if (isMobile && !isExitingGallery.current) {
        if (
          intendedPosY < bounds.current.minCameraY ||
          intendedPosY > bounds.current.maxCameraY
        ) {
          const isTop = intendedPosY > bounds.current.maxCameraY;
          boundaryState.current = isTop ? "top" : "bottom";
          overscrollY.current = Math.max(
            0,
            overscrollY.current + (isTop ? deltaY : -deltaY),
          );

          if (overscrollY.current > 28 && !isHoldingToContinue.current) {
            isHoldingToContinue.current = true;
            holdStartTime.current = performance.now();
          } else if (overscrollY.current < 16) {
            isHoldingToContinue.current = false;
            holdStartTime.current = null;
            dispatchGalleryState(0, boundaryState.current, false);
          }
          targets.current.posY = isTop
            ? bounds.current.maxCameraY +
              overscrollY.current *
                0.18 *
                (bounds.current.visibleHalfHeight / viewport.current.h)
            : bounds.current.minCameraY -
              overscrollY.current *
                0.18 *
                (bounds.current.visibleHalfHeight / viewport.current.h);
        } else {
          overscrollY.current = 0;
          isHoldingToContinue.current = false;
          holdStartTime.current = null;
          boundaryState.current = "none";
          targets.current.posY = intendedPosY;
          dispatchGalleryState(0, "none", false);
        }
      } else {
        targets.current.posY = THREE.MathUtils.clamp(
          intendedPosY,
          bounds.current.minCameraY,
          bounds.current.maxCameraY,
        );
      }
    };

    const handlePointerUp = () => {
      if (!isDragging.current) return;
      const wasRealDrag = hasExceededDragThreshold.current;
      isDragging.current = false;
      hasExceededDragThreshold.current = false;
      onDraggingChangeRef.current?.(false);

      if (activePointerId.current !== null) {
        try {
          canvasEl.releasePointerCapture(activePointerId.current);
        } catch {
          // Ignore if capture was already released
        }
        activePointerId.current = null;
      }
      isHoldingToContinue.current = false;
      holdStartTime.current = null;

      if (
        isMobile &&
        !isExitingGallery.current &&
        boundaryState.current !== "none"
      ) {
        targets.current.posY =
          boundaryState.current === "bottom"
            ? bounds.current.minCameraY
            : bounds.current.maxCameraY;
        overscrollY.current = 0;
        boundaryState.current = "none";
        pointer.current.vY = 0;
        dispatchGalleryState(0, "none", false);
      } else if (wasRealDrag && boundaryState.current === "none") {
        // Weighted physical inertia coast on swipe release
        if (
          Math.abs(pointer.current.vX) > 1.5 ||
          Math.abs(pointer.current.vY) > 1.5
        ) {
          targets.current.rotY +=
            (pointer.current.vX / viewport.current.w) * Math.PI * 2.4;
          targets.current.posY = THREE.MathUtils.clamp(
            targets.current.posY +
              (pointer.current.vY / viewport.current.h) *
                (bounds.current.visibleHalfHeight * 4.5),
            bounds.current.minCameraY,
            bounds.current.maxCameraY,
          );
        }
      }
    };

    canvasEl.style.touchAction = "none";
    window.addEventListener("pointermove", handlePointerMove, {
      passive: false,
    });
    canvasEl.addEventListener("pointerdown", handlePointerDown, {
      passive: false,
    });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      canvasEl.style.touchAction = prevTouchAction;
      onDraggingChangeRef.current?.(false);
      window.removeEventListener("pointermove", handlePointerMove);
      canvasEl.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [introCompleted, get, isMobile]);

  useFrame((_, delta) => {
    const { camera, gl } = get();
    const holdStart = holdStartTime.current;

    if (
      !isMobile ||
      isExitingGallery.current ||
      !isHoldingToContinue.current ||
      holdStart === null
    ) {
      if (introCompleted) {
        const safeDelta = Math.min(delta, 0.1);
        // Viscous, fluid damping:
        // - Active drag: responsive yet silky (8.5)
        // - Desktop hover focus: gently cushioned (0.85) so cards stay steady while reading
        // - Free cruise / inertial coast: weighted & smooth (1.65 desktop / 2.2 mobile)
        const targetLambda = isDragging.current
          ? 8.5
          : isMobile
            ? 2.2
            : isFocusedRef.current
              ? 0.85
              : 1.65;

        currentLambda.current = THREE.MathUtils.damp(
          currentLambda.current,
          targetLambda,
          3.0,
          safeDelta,
        );

        camera.rotation.y = THREE.MathUtils.damp(
          camera.rotation.y,
          targets.current.rotY,
          currentLambda.current,
          safeDelta,
        );
        camera.position.y = THREE.MathUtils.damp(
          camera.position.y,
          targets.current.posY,
          currentLambda.current,
          safeDelta,
        );
        camera.updateMatrixWorld();
      }
      return;
    }

    const progress = Math.min((performance.now() - holdStart) / 1500, 1.0);
    if (progress >= 1.0) {
      isExitingGallery.current = true;
      isDragging.current = false;
      hasExceededDragThreshold.current = false;
      onDraggingChangeRef.current?.(false);
      isHoldingToContinue.current = false;
      holdStartTime.current = null;
      if (activePointerId.current !== null) {
        try {
          gl.domElement.releasePointerCapture(activePointerId.current);
        } catch {
          // Ignore if capture was already released
        }
        activePointerId.current = null;
      }
      dispatchGalleryState(1.0, boundaryState.current, true);
      if (boundaryState.current === "bottom") {
        const trendingEl = document.getElementById("trending-section");
        if (trendingEl) {
          const targetTop = Math.max(
            0,
            trendingEl.getBoundingClientRect().top +
              window.scrollY -
              NAVBAR_HEIGHT_PX,
          );
          window.scrollTo({ top: targetTop, behavior: "smooth" });
        }
      } else if (boundaryState.current === "top") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      if (exitResetTimerRef.current !== null) {
        window.clearTimeout(exitResetTimerRef.current);
      }
      exitResetTimerRef.current = window.setTimeout(() => {
        isExitingGallery.current = false;
        exitResetTimerRef.current = null;
        dispatchGalleryState(0, "none", false);
      }, 900);
    } else {
      dispatchGalleryState(progress, boundaryState.current, false);
    }
  });

  return null;
}
