// C:\Projects\animanga-platform\apps\web\src\components\canvas\GalleryImage.tsx
import { useRef, useEffect, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import gsap from "gsap";

import "./GalleryShaderMaterial";
import { getCachedGalleryTexture } from "./galleryTextureStore";
import type { CalculatedProjectData } from "@/lib/data";

declare module "@react-three/fiber" {
  interface ThreeElements {
    galleryShaderMaterial: ThreeElements["shaderMaterial"] & {
      uTexture?: THREE.Texture | null;
      uCurveAmountX?: number;
      uCurveAmountY?: number;
      uImageWidth?: number;
      uImageHeight?: number;
      uSizeFactorX?: number;
      uSizeFactorY?: number;
      uTiltAngle?: number;
      uOpacity?: number;
      uBgColor?: THREE.Color;
    };
  }
}

type GalleryMaterialType = THREE.ShaderMaterial & {
  uCurveAmountX: number;
  uTiltAngle: number;
  uOpacity: number;
  uBgColor: THREE.Color;
};

interface GalleryImageProps {
  data: CalculatedProjectData;
  globalCurveX: React.RefObject<number>;
  globalTiltAngle: React.RefObject<number>;
  isDraggingRef: React.RefObject<boolean>;
  hoveredId: string | null;
  onHoverEnter: (id: string) => void;
  onHoverLeave: (id: string) => void;
  onTouchToggle: (id: string) => void;
  triggerIntro: boolean;
  introCompleted: boolean;
}

const DIMMED_FOG_OPACITY = 0.14;
const FOCUS_SCALE = 1.045;
const TAP_MAX_DRIFT_PX = 10;
const TAP_MAX_DURATION_MS = 320;

export default function GalleryImage({
  data,
  globalCurveX,
  globalTiltAngle,
  isDraggingRef,
  hoveredId,
  onHoverEnter,
  onHoverLeave,
  onTouchToggle,
  triggerIntro,
  introCompleted,
}: GalleryImageProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<GalleryMaterialType>(null);
  const originalQuat = useRef<THREE.Quaternion>(new THREE.Quaternion());
  const hasHovered = useRef(false);
  const hasRevealed = useRef(false);
  const tapStartRef = useRef<{ x: number; y: number; time: number } | null>(
    null,
  );

  const { size } = useThree();
  const isMobile = size.width < 768;
  const texture = getCachedGalleryTexture(data.image.url, isMobile);

  useLayoutEffect(() => {
    if (!meshRef.current) return;
    meshRef.current.position.set(data.xPos, data.yPos, data.zPos);
    meshRef.current.scale.set(1, 1, 1);
    meshRef.current.lookAt(0, data.yPos, 0);
    originalQuat.current.copy(meshRef.current.quaternion);
  }, [data.xPos, data.yPos, data.zPos]);

  useEffect(() => {
    if (!materialRef.current || !meshRef.current) return;
    if (!triggerIntro) {
      materialRef.current.uOpacity = 0;
      hasRevealed.current = false;
      return;
    }

    const safeOpacity = data.baseOpacity ?? 1;

    if (hasRevealed.current) {
      materialRef.current.uOpacity = safeOpacity;
      return;
    }
    hasRevealed.current = true;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        materialRef.current,
        { uOpacity: 0 },
        {
          uOpacity: safeOpacity,
          duration: 1.5,
          ease: "power2.out",
        },
      );

      gsap.to(meshRef.current!.quaternion, {
        x: originalQuat.current.x,
        y: originalQuat.current.y,
        z: originalQuat.current.z,
        w: originalQuat.current.w,
        duration: 0.8,
        ease: "power3.out",
        delay: 1.2,
        onUpdate: () => meshRef.current?.quaternion.normalize(),
      });
    });

    return () => ctx.revert();
  }, [data.baseOpacity, triggerIntro]);

  useFrame((state, delta) => {
    const mat = materialRef.current;
    if (!mat) return;

    const safeDelta = Math.min(delta, 0.1);

    if (state.scene.fog) {
      mat.uBgColor
        .copy((state.scene.fog as THREE.Fog).color)
        .convertLinearToSRGB();
    }

    const targetCurveX = isMobile ? 0 : globalCurveX.current;
    mat.uCurveAmountX = THREE.MathUtils.damp(
      mat.uCurveAmountX,
      targetCurveX,
      2.6,
      safeDelta,
    );

    const targetTilt = isMobile ? 0 : globalTiltAngle.current * 0;
    mat.uTiltAngle = THREE.MathUtils.damp(
      mat.uTiltAngle,
      targetTilt,
      2.6,
      safeDelta,
    );
  });

  // Unhurried fog dissolve + subtle 3D forward lift for focused card
  useEffect(() => {
    const mat = materialRef.current;
    const mesh = meshRef.current;
    if (!mat || !mesh || !triggerIntro) return;
    if (hoveredId === null && !hasHovered.current) return;

    if (hoveredId !== null) {
      hasHovered.current = true;
    }

    const isFocused = hoveredId === data.id;
    const safeOpacity = data.baseOpacity ?? 1;
    const targetOpacity =
      hoveredId !== null
        ? isFocused
          ? safeOpacity
          : DIMMED_FOG_OPACITY
        : safeOpacity;

    const radialDist = Math.hypot(data.xPos, data.zPos) || 1;
    const pullUnits = isFocused ? (isMobile ? 160 : 140) : 0;
    const radialRatio = (radialDist - pullUnits) / radialDist;
    const targetX = data.xPos * radialRatio;
    const targetZ = data.zPos * radialRatio;
    const targetScale = isFocused ? FOCUS_SCALE : 1;

    mesh.renderOrder = isFocused ? 10 : 0;

    const ctx = gsap.context(() => {
      gsap.to(mat, {
        uOpacity: targetOpacity,
        duration: isFocused ? 0.85 : 1.1,
        ease: "sine.inOut",
        overwrite: "auto",
      });

      gsap.to(mesh.position, {
        x: targetX,
        z: targetZ,
        duration: 1.15,
        ease: "power2.out",
        overwrite: "auto",
      });

      gsap.to(mesh.scale, {
        x: targetScale,
        y: targetScale,
        duration: 1.15,
        ease: "power2.out",
        overwrite: "auto",
      });
    });

    return () => ctx.revert();
  }, [
    hoveredId,
    data.baseOpacity,
    data.id,
    data.xPos,
    data.zPos,
    triggerIntro,
    isMobile,
  ]);

  const planeArgs = useMemo(
    () =>
      [
        data.calcWidth,
        data.calcHeight,
        isMobile ? 4 : 20,
        isMobile ? 4 : 20,
      ] as const,
    [data.calcWidth, data.calcHeight, isMobile],
  );

  const handlePointerEnter = (e: ThreeEvent<PointerEvent>) => {
    if (!introCompleted || isMobile || isDraggingRef.current) return;
    if (e.pointerType !== "mouse") return;
    e.stopPropagation();
    onHoverEnter(data.id);
  };

  const handlePointerLeave = (e: ThreeEvent<PointerEvent>) => {
    if (!introCompleted || isMobile) return;
    if (e.pointerType !== "mouse") return;
    e.stopPropagation();
    onHoverLeave(data.id);
  };

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (!introCompleted) return;
    if (e.pointerType === "mouse") return;
    tapStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: performance.now(),
    };
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (!introCompleted) return;
    if (e.pointerType === "mouse") return;
    const start = tapStartRef.current;
    tapStartRef.current = null;
    if (!start) return;

    const drift = Math.hypot(e.clientX - start.x, e.clientY - start.y);
    const elapsed = performance.now() - start.time;

    if (drift <= TAP_MAX_DRIFT_PX && elapsed <= TAP_MAX_DURATION_MS) {
      e.stopPropagation();
      onTouchToggle(data.id);
    }
  };

  if (!texture) return null;

  return (
    <mesh
      ref={meshRef}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      <planeGeometry args={planeArgs} />
      <galleryShaderMaterial
        ref={materialRef}
        uTexture={texture}
        uImageWidth={data.calcWidth}
        uImageHeight={data.calcHeight}
        uSizeFactorX={data.calcWidth / 2000}
        uSizeFactorY={data.calcHeight / 2000}
        transparent={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
