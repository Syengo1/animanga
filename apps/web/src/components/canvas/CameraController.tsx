import { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import gsap from "gsap";

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

  // Base Interaction State
  const isDragging = useRef(false);
  const isExitingGallery = useRef(false);
  const activePointerId = useRef<number | null>(null);

  // Time-Based Gesture State Machine
  const overscrollY = useRef(0);
  const isHoldingToContinue = useRef(false);
  const holdStartTime = useRef<number | null>(null);
  const boundaryState = useRef<"none" | "top" | "bottom">("none");

  // Single source of truth for the UI indicator
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

  // ==================================================
  // TIMER EVALUATION LOOP (Executes Auto-Nav)
  // ==================================================
  useFrame(() => {
    if (
      !isMobile ||
      isExitingGallery.current ||
      !isHoldingToContinue.current ||
      holdStartTime.current === null
    )
      return;

    const REQUIRED_HOLD_TIME = 1500; // 1 second of deliberate holding required
    const elapsed = performance.now() - holdStartTime.current;
    const progress = Math.min(elapsed / REQUIRED_HOLD_TIME, 1.0);

    if (progress >= 1.0) {
      isExitingGallery.current = true;
      isDragging.current = false;
      isHoldingToContinue.current = false;
      holdStartTime.current = null;

      gsap.killTweensOf(camera.position);
      gsap.killTweensOf(camera.rotation);

      if (activePointerId.current !== null) {
        try {
          gl.domElement.releasePointerCapture(activePointerId.current);
        } catch {
          // Pointer capture may already be released
        }
        activePointerId.current = null;
      }

      dispatchGalleryState(1.0, boundaryState.current, true);

      if (boundaryState.current === "bottom") {
        const nextSection = document.getElementById("trending-section");
        if (nextSection) {
          nextSection.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      } else if (boundaryState.current === "top") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }

      // Keep the "CONTINUING..." UI visible during the CSS transition, then reset
      window.setTimeout(() => {
        isExitingGallery.current = false;
        dispatchGalleryState(0, "none", false);
      }, 900);
    } else {
      // Progressively fill the UI timer ring
      dispatchGalleryState(progress, boundaryState.current, false);
    }
  });

  // ==================================================
  // CAMERA PHYSICS & GESTURES
  // ==================================================
  useEffect(() => {
    if (!introCompleted) return;

    const perspectiveCamera = camera as THREE.PerspectiveCamera;
    const fovRad = THREE.MathUtils.degToRad(perspectiveCamera.fov);
    const hFov = 2 * Math.atan(Math.tan(fovRad / 2) * perspectiveCamera.aspect);
    const hFovDeg = THREE.MathUtils.radToDeg(hFov);

    const hLimit = isMobile
      ? THREE.MathUtils.degToRad(135 - hFovDeg / 8)
      : THREE.MathUtils.degToRad(135 - hFovDeg / 2);

    const visibleHalfHeight = Math.tan(fovRad / 2) * galleryRadius;
    const verticalPadding = isMobile ? 200 : 300;

    let maxCameraY = topBoundary - visibleHalfHeight + verticalPadding;
    let minCameraY = bottomBoundary + visibleHalfHeight - verticalPadding;

    if (minCameraY > maxCameraY) {
      const mid = (topBoundary + bottomBoundary) / 2;
      maxCameraY = mid;
      minCameraY = mid;
    }

    let lastX = 0;
    let lastY = 0;
    let velocityX = 0;
    let velocityY = 0;
    let dragTargetRotY = camera.rotation.y;
    let dragTargetPosY = camera.position.y;

    const handlePointerDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;

      isDragging.current = true;
      activePointerId.current = e.pointerId;
      lastX = e.clientX;
      lastY = e.clientY;
      velocityX = 0;
      velocityY = 0;

      overscrollY.current = 0;
      isHoldingToContinue.current = false;
      holdStartTime.current = null;
      boundaryState.current = "none";

      gsap.killTweensOf(camera.rotation);
      gsap.killTweensOf(camera.position);

      dragTargetRotY = camera.rotation.y;
      dragTargetPosY = camera.position.y;

      if (e.pointerType !== "mouse") {
        gl.domElement.setPointerCapture(e.pointerId);
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      // 1. DESKTOP HOVER SWAY
      if (e.pointerType === "mouse" && !isDragging.current) {
        const ndcX = (e.clientX / size.width) * 2 - 1;
        const ndcY = -(e.clientY / size.height) * 2 + 1;

        const targetY = THREE.MathUtils.mapLinear(
          ndcY,
          -1,
          1,
          minCameraY,
          maxCameraY,
        );

        gsap.to(camera.rotation, {
          y: -ndcX * hLimit,
          duration: 2,
          ease: "power4.out",
          overwrite: "auto",
        });
        gsap.to(camera.position, {
          y: targetY,
          duration: 2,
          ease: "power4.out",
          overwrite: "auto",
        });
        return;
      }

      // 2. KINETIC DRAG & OVERSCROLL TRACKING
      if (!isDragging.current) return;

      const deltaX = e.clientX - lastX;
      const deltaY = e.clientY - lastY;

      velocityX = deltaX;
      velocityY = deltaY;

      lastX = e.clientX;
      lastY = e.clientY;

      const rotFactor = (deltaX / size.width) * Math.PI * 1.5;
      const posFactor = (deltaY / size.height) * (visibleHalfHeight * 2.0);
      const intendedPosY = dragTargetPosY + posFactor;

      dragTargetRotY += rotFactor;

      if (isMobile && !isExitingGallery.current) {
        // Hysteresis dead zones (prevents timer stutter)
        const ENTER_HOLD_DISTANCE = 28;
        const EXIT_HOLD_DISTANCE = 16;
        const RUBBER_BAND_FRICTION = 0.18;

        if (intendedPosY < minCameraY) {
          boundaryState.current = "bottom";
          const isStretching = deltaY < 0;

          overscrollY.current += isStretching
            ? Math.abs(deltaY)
            : -Math.abs(deltaY);
          overscrollY.current = Math.max(0, overscrollY.current);

          // Timer Start/Stop Hysteresis
          if (overscrollY.current > ENTER_HOLD_DISTANCE) {
            if (!isHoldingToContinue.current) {
              isHoldingToContinue.current = true;
              holdStartTime.current = performance.now();
            }
          } else if (overscrollY.current < EXIT_HOLD_DISTANCE) {
            isHoldingToContinue.current = false;
            holdStartTime.current = null;
            dispatchGalleryState(0, "bottom", false);
          }

          dragTargetPosY =
            minCameraY -
            overscrollY.current *
              RUBBER_BAND_FRICTION *
              (visibleHalfHeight / size.height);
        } else if (intendedPosY > maxCameraY) {
          boundaryState.current = "top";
          const isStretching = deltaY > 0;

          overscrollY.current += isStretching
            ? Math.abs(deltaY)
            : -Math.abs(deltaY);
          overscrollY.current = Math.max(0, overscrollY.current);

          if (overscrollY.current > ENTER_HOLD_DISTANCE) {
            if (!isHoldingToContinue.current) {
              isHoldingToContinue.current = true;
              holdStartTime.current = performance.now();
            }
          } else if (overscrollY.current < EXIT_HOLD_DISTANCE) {
            isHoldingToContinue.current = false;
            holdStartTime.current = null;
            dispatchGalleryState(0, "top", false);
          }

          dragTargetPosY =
            maxCameraY +
            overscrollY.current *
              RUBBER_BAND_FRICTION *
              (visibleHalfHeight / size.height);
        } else {
          // Inside Bounds: Complete Reset
          overscrollY.current = 0;
          isHoldingToContinue.current = false;
          holdStartTime.current = null;
          boundaryState.current = "none";
          dragTargetPosY = intendedPosY;
          dispatchGalleryState(0, "none", false);
        }
      } else {
        dragTargetPosY = THREE.MathUtils.clamp(
          intendedPosY,
          minCameraY,
          maxCameraY,
        );
      }

      camera.rotation.y = dragTargetRotY;
      camera.position.y = dragTargetPosY;
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!isDragging.current) return;
      isDragging.current = false;

      // 1. Release capture immediately
      if (activePointerId.current !== null) {
        try {
          gl.domElement.releasePointerCapture(activePointerId.current);
        } catch {}
        activePointerId.current = null;
      }

      // 2. Halt Timer Logic
      isHoldingToContinue.current = false;
      holdStartTime.current = null;

      // 3. User Released Early: Snap Back
      if (
        isMobile &&
        !isExitingGallery.current &&
        boundaryState.current !== "none"
      ) {
        const snapPosY =
          boundaryState.current === "bottom" ? minCameraY : maxCameraY;
        dragTargetPosY = snapPosY;

        gsap.to(camera.position, {
          y: snapPosY,
          duration: 0.5,
          ease: "back.out(1.2, 0.8)",
          overwrite: "auto",
        });

        overscrollY.current = 0;
        boundaryState.current = "none";
        velocityY = 0; // Destroy velocity to prevent momentum collision

        dispatchGalleryState(0, "none", false);
      } else if (boundaryState.current === "none") {
        // 4. Normal Release Inside Bounds: Momentum Glide
        if (Math.abs(velocityX) > 2 || Math.abs(velocityY) > 2) {
          const glideRot =
            dragTargetRotY + (velocityX / size.width) * Math.PI * 3;
          const glidePos = THREE.MathUtils.clamp(
            dragTargetPosY +
              (velocityY / size.height) * (visibleHalfHeight * 6),
            minCameraY,
            maxCameraY,
          );

          gsap.to(camera.rotation, {
            y: glideRot,
            duration: 1.5,
            ease: "power3.out",
            overwrite: "auto",
          });
          gsap.to(camera.position, {
            y: glidePos,
            duration: 1.5,
            ease: "power3.out",
            overwrite: "auto",
          });
        }
      }
    };

    const canvasEl = gl.domElement;
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
  }, [
    camera,
    introCompleted,
    size,
    gl,
    topBoundary,
    bottomBoundary,
    galleryRadius,
    isMobile,
  ]);

  return null;
}
