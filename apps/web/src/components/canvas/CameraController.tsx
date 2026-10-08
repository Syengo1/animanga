import { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function CameraController({
  introCompleted,
  topBoundary = 0,
  bottomBoundary = 0,
  galleryRadius = 2500,
}: {
  introCompleted: boolean;
  topBoundary?: number;
  bottomBoundary?: number;
  galleryRadius?: number;
}) {
  const { camera, size, gl } = useThree();
  const isMobile = size.width < 768;

  // Immortal Physics State
  const isDragging = useRef(false);
  const isExitingGallery = useRef(false);
  const activePointerId = useRef<number | null>(null);

  const pointer = useRef({ lastX: 0, lastY: 0, vX: 0, vY: 0 });
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

  const dispatchGalleryState = (
    intentProgress: number,
    boundary: "none" | "top" | "bottom",
    ready = false,
  ) => {
    window.dispatchEvent(
      new CustomEvent("gallery-overscroll", {
        detail: { intentProgress, boundary, ready },
      }),
    );
  };

  useEffect(() => {
    if (!introCompleted) return;
    viewport.current.w = size.width;
    viewport.current.h = size.height;

    const fovRad = THREE.MathUtils.degToRad(
      (camera as THREE.PerspectiveCamera).fov,
    );
    const hFovDeg = THREE.MathUtils.radToDeg(
      2 *
        Math.atan(
          Math.tan(fovRad / 2) * (camera as THREE.PerspectiveCamera).aspect,
        ),
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
    camera,
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
    const canvasEl = gl.domElement;

    const handlePointerDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      isDragging.current = true;
      activePointerId.current = e.pointerId;
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
      if (e.pointerType !== "mouse") canvasEl.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: PointerEvent) => {
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
      pointer.current.vX = deltaX;
      pointer.current.vY = deltaY;
      pointer.current.lastX = e.clientX;
      pointer.current.lastY = e.clientY;

      targets.current.rotY += (deltaX / viewport.current.w) * Math.PI * 1.5;
      const intendedPosY =
        targets.current.posY +
        (deltaY / viewport.current.h) *
          (bounds.current.visibleHalfHeight * 2.0);

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

    const handlePointerUp = (e: PointerEvent) => {
      if (!isDragging.current) return;
      isDragging.current = false;
      if (activePointerId.current !== null) {
        try {
          canvasEl.releasePointerCapture(activePointerId.current);
        } catch {}
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
      } else if (boundaryState.current === "none") {
        if (
          Math.abs(pointer.current.vX) > 2 ||
          Math.abs(pointer.current.vY) > 2
        ) {
          targets.current.rotY +=
            (pointer.current.vX / viewport.current.w) * Math.PI * 3;
          targets.current.posY = THREE.MathUtils.clamp(
            targets.current.posY +
              (pointer.current.vY / viewport.current.h) *
                (bounds.current.visibleHalfHeight * 6),
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
      window.removeEventListener("pointermove", handlePointerMove);
      canvasEl.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [introCompleted, camera, gl.domElement, isMobile]);

  useFrame((_, delta) => {
    if (
      !isMobile ||
      isExitingGallery.current ||
      !isHoldingToContinue.current ||
      holdStartTime.current === null
    ) {
      if (introCompleted) {
        const safeDelta = Math.min(delta, 0.1);
        if (isDragging.current) {
          camera.rotation.y = targets.current.rotY;
          camera.position.y = targets.current.posY;
        } else {
          camera.rotation.y = THREE.MathUtils.damp(
            camera.rotation.y,
            targets.current.rotY,
            4,
            safeDelta,
          );
          camera.position.y = THREE.MathUtils.damp(
            camera.position.y,
            targets.current.posY,
            4,
            safeDelta,
          );
        }
        camera.updateMatrixWorld();
      }
      return;
    }
    const progress = Math.min(
      (performance.now() - holdStartTime.current) / 1500,
      1.0,
    );
    if (progress >= 1.0) {
      isExitingGallery.current = true;
      isDragging.current = false;
      isHoldingToContinue.current = false;
      holdStartTime.current = null;
      if (activePointerId.current !== null) {
        try {
          gl.domElement.releasePointerCapture(activePointerId.current);
        } catch {}
        activePointerId.current = null;
      }
      dispatchGalleryState(1.0, boundaryState.current, true);
      if (boundaryState.current === "bottom")
        document
          .getElementById("trending-section")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      else if (boundaryState.current === "top")
        window.scrollTo({ top: 0, behavior: "smooth" });
      window.setTimeout(() => {
        isExitingGallery.current = false;
        dispatchGalleryState(0, "none", false);
      }, 900);
    } else {
      dispatchGalleryState(progress, boundaryState.current, false);
    }
  });

  return null;
}
