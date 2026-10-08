import { useRef, useEffect, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { useTexture } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import gsap from "gsap";

import "./GalleryShaderMaterial";
import { projectsData, CalculatedProjectData } from "@/lib/data";

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
      uBgColor?: THREE.Color; // Add uniform to types
    };
  }
}

type GalleryMaterialType = THREE.ShaderMaterial & {
  uCurveAmountX: number;
  uTiltAngle: number;
  uOpacity: number;
  uBgColor: THREE.Color; // Add uniform to types
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
  }, [texture, gl]);

  useLayoutEffect(() => {
    if (!meshRef.current) return;
    meshRef.current.position.set(data.xPos, data.yPos, data.zPos);
    meshRef.current.lookAt(0, data.yPos, 0);
    originalQuat.current.copy(meshRef.current.quaternion);
  }, [data.xPos, data.yPos, data.zPos]);

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

  useFrame((state) => {
    if (!materialRef.current) return;

    // CRITICAL FIX: Synchronize the shader's background color with the dynamic scene fog.
    // This ensures the cards fade smoothly into White in Light Mode and Black in Dark Mode.
    if (state.scene.fog) {
      materialRef.current.uBgColor.copy((state.scene.fog as THREE.Fog).color);
    }

    const isMobile = size.width < 768;
    const targetCurveX = isMobile ? 0 : globalCurveX.current;
    const targetTilt = 0;

    const diffX = targetCurveX - materialRef.current.uCurveAmountX;
    if (Math.abs(diffX) > 0.0001) {
      materialRef.current.uCurveAmountX += diffX * 0.05;
    }

    const diffTilt = targetTilt - materialRef.current.uTiltAngle;
    if (Math.abs(diffTilt) > 0.0001) {
      materialRef.current.uTiltAngle += diffTilt * 0.05;
    }
  });

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
        // CRITICAL FIX: Make the planes solid. By disabling true WebGL transparency,
        // depth-testing correctly clips overlapping cards and perfectly blocks Sparkles.
        transparent={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
