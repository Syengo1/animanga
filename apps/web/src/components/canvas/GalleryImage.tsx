import { useRef, useEffect, useLayoutEffect } from "react";
import * as THREE from "three";
import { useTexture } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import gsap from "gsap";

import "./GalleryShaderMaterial";
import { CalculatedProjectData } from "@/lib/data";

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

  // CLEANUP: Single texture load, mutating the cache directly to save VRAM
  const texture = useTexture(data.image.url) as THREE.Texture;

  useLayoutEffect(() => {
    if (!texture) return;

    texture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;

    if (!texture.mipmaps || texture.mipmaps.length === 0) {
      texture.generateMipmaps = true;
      texture.needsUpdate = true;
    }
  }, [texture, gl]);

  // PHASE 1 FIX: Deterministic layout without random twists
  useLayoutEffect(() => {
    if (!meshRef.current) return;

    meshRef.current.position.set(data.xPos, data.yPos, data.zPos);

    // Deterministic orientation: perfectly face the center of the cylinder/gallery.
    meshRef.current.lookAt(0, data.yPos, 0);

    // Store the exact intended orientation for the GSAP intro animation snap.
    originalQuat.current.copy(meshRef.current.quaternion);

    // Math.random() rotations have been completely removed.
  }, [data]);

  // Synchronized 2.0s Entrance Animation
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

  useFrame(() => {
    if (!materialRef.current) return;

    const isMobile = size.width < 768;
    const targetCurveX = isMobile ? 0 : globalCurveX.current;

    // TEMPORARY PHASE 1 FIX: Force tilt to 0 for debugging base layout stability
    const targetTilt = 0;

    materialRef.current.uCurveAmountX = THREE.MathUtils.lerp(
      materialRef.current.uCurveAmountX,
      targetCurveX,
      0.05,
    );
    materialRef.current.uTiltAngle = THREE.MathUtils.lerp(
      materialRef.current.uTiltAngle,
      targetTilt,
      0.05,
    );
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
      <planeGeometry args={[data.calcWidth, data.calcHeight, 20, 20]} />
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
