import { useRef, useEffect, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { useTexture } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import gsap from "gsap";

import "./GalleryShaderMaterial";
import { projectsData, CalculatedProjectData } from "@/lib/data";

// 1. CRITICAL PERFORMANCE FIX: Preload all textures into the browser's cache instantly
// when the JS bundle parses, eliminating network waterfall delays when the Canvas mounts.
if (typeof window !== "undefined") {
  projectsData.forEach((d) => {
    useTexture.preload(d.image.url);
  });
}

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
    };
  }
}

type GalleryMaterialType = THREE.ShaderMaterial & {
  uCurveAmountX: number;
  uTiltAngle: number;
  uOpacity: number;
};

interface GalleryImageProps {
  data: CalculatedProjectData;
  globalCurveX: React.MutableRefObject<number>;
  globalTiltAngle: React.MutableRefObject<number>;
  hoveredId: string | null;
  setHoveredId: React.Dispatch<React.SetStateAction<string | null>>;
  triggerIntro: boolean;
}

export default function GalleryImage({
  data,
  globalCurveX,
  globalTiltAngle,
  hoveredId,
  setHoveredId,
  triggerIntro,
}: GalleryImageProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<GalleryMaterialType>(null);
  const originalQuat = useRef<THREE.Quaternion>(new THREE.Quaternion());
  const hasHovered = useRef(false);

  const { gl, size } = useThree();

  const texture = useTexture(data.image.url) as THREE.Texture;

  useLayoutEffect(() => {
    if (!texture) return;

    texture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;

    // 2. CRITICAL FIX: Removed manual `generateMipmaps` and `needsUpdate`.
    // Three.js and useTexture already handle this automatically and asynchronously.
    // Forcing it here caused the massive main-thread freeze.
  }, [texture, gl]);

  useLayoutEffect(() => {
    if (!meshRef.current) return;

    meshRef.current.position.set(data.xPos, data.yPos, data.zPos);

    // Deterministic orientation: perfectly face the center of the cylinder/gallery.
    meshRef.current.lookAt(0, data.yPos, 0);

    // Store the exact intended orientation for the GSAP intro animation snap.
    originalQuat.current.copy(meshRef.current.quaternion);
  }, [data.xPos, data.yPos, data.zPos]); // Optimized dependencies

  // Synchronized Entrance Animation
  useEffect(() => {
    if (!materialRef.current || !meshRef.current) return;

    if (!triggerIntro) {
      materialRef.current.uOpacity = 0;
      return;
    }

    const safeOpacity = data.baseOpacity ?? 1;

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

  // 3. PERFORMANCE FIX: Optimized 60FPS Render Loop
  useFrame(() => {
    if (!materialRef.current) return;

    const isMobile = size.width < 768;
    const targetCurveX = isMobile ? 0 : globalCurveX.current;
    const targetTilt = 0;

    // Epsilon check: Only calculate lerps and mutate uniforms if the value has actually changed.
    // This prevents Three.js from unnecessarily pushing uniform updates to the GPU while the gallery is idle.
    const diffX = targetCurveX - materialRef.current.uCurveAmountX;
    if (Math.abs(diffX) > 0.0001) {
      materialRef.current.uCurveAmountX += diffX * 0.05;
    }

    const diffTilt = targetTilt - materialRef.current.uTiltAngle;
    if (Math.abs(diffTilt) > 0.0001) {
      materialRef.current.uTiltAngle += diffTilt * 0.05;
    }
  });

  // Interactive Hover Animation
  useEffect(() => {
    if (!materialRef.current || !triggerIntro) return;

    if (hoveredId === null && !hasHovered.current) return;

    if (hoveredId !== null) {
      hasHovered.current = true;
    }

    const isHovered = hoveredId === data.id;
    const safeOpacity = data.baseOpacity ?? 1;
    const dimmedOpacity = 0.5;

    const targetOpacity =
      hoveredId !== null
        ? isHovered
          ? safeOpacity
          : dimmedOpacity
        : safeOpacity;

    const ctx = gsap.context(() => {
      gsap.to(materialRef.current, {
        uOpacity: targetOpacity,
        duration: 0.75,
        ease: "power1.inOut",
        overwrite: "auto",
      });
    });

    return () => ctx.revert();
  }, [hoveredId, data.baseOpacity, data.id, triggerIntro]);

  // 4. MEMORY FIX: Memoize geometry arguments so React doesn't re-evaluate array equality
  const planeArgs = useMemo(
    () => [data.calcWidth, data.calcHeight, 20, 20] as const,
    [data.calcWidth, data.calcHeight],
  );

  return (
    <mesh
      ref={meshRef}
      onPointerEnter={(e) => {
        if (window.matchMedia("(hover: none)").matches) return;
        e.stopPropagation();
        setHoveredId(data.id);
      }}
      onPointerLeave={(e) => {
        if (window.matchMedia("(hover: none)").matches) return;
        e.stopPropagation();
        setHoveredId(null);
      }}
    >
      <planeGeometry args={planeArgs} />
      <galleryShaderMaterial
        ref={materialRef}
        uTexture={texture}
        uImageWidth={data.calcWidth}
        uImageHeight={data.calcHeight}
        uSizeFactorX={data.calcWidth / 2000}
        uSizeFactorY={data.calcHeight / 2000}
        uOpacity={0}
        transparent={true}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
