// C:\Projects\animanga-platform\apps\web\src\components\canvas\SphereGallery.tsx
import { useRef, useEffect, useState, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import gsap from "gsap";
import GalleryImage from "./GalleryImage";
import CameraController from "./CameraController";
import { projectsData } from "@/lib/data";
import type { ProjectData, CalculatedProjectData } from "@/lib/data";

interface SphereGalleryProps {
  onSelectProject?: (id: string | null) => void;
  triggerIntro: boolean;
  onReady?: () => void;
  onIntroComplete?: () => void;
}

export default function SphereGallery({
  onSelectProject,
  triggerIntro,
  onReady,
  onIntroComplete,
}: SphereGalleryProps) {
  const { get, size } = useThree();
  const isMobile = size.width < 768;

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isDiveComplete, setIsDiveComplete] = useState(false);

  const globalCurveX = useRef(0);
  const globalTiltAngle = useRef(0);

  // Track raw velocity for smoothing
  const rawVelX = useRef(0);
  const rawVelY = useRef(0);
  const smoothVelX = useRef(0);
  const smoothVelY = useRef(0);

  const readySignaled = useRef(false);
  const frameCounter = useRef(0);
  const introStarted = useRef(false);

  const onReadyRef = useRef(onReady);
  const onIntroCompleteRef = useRef(onIntroComplete);
  useEffect(() => {
    onReadyRef.current = onReady;
    onIntroCompleteRef.current = onIntroComplete;
  }, [onReady, onIntroComplete]);

  // Layout Calculation Engine (Exact original desktop & mobile geometry)
  const { layoutData, topBoundary, bottomBoundary, galleryRadius } =
    useMemo(() => {
      let topBound = -Infinity;
      let bottomBound = Infinity;

      const designScale = THREE.MathUtils.clamp(
        Math.min(size.width, size.height) / 1000,
        0.65,
        1.6,
      );

      const activeRadius = isMobile ? 3000 : 2500 * designScale;
      let maxAspect = 1;

      for (let i = 0; i < projectsData.length; i++) {
        const p = projectsData[i];
        const aspect = p.image.dimensions.height / p.image.dimensions.width;
        if (aspect > maxAspect) maxAspect = aspect;
      }

      const mappedData: CalculatedProjectData[] = [];

      for (let index = 0; index < projectsData.length; index++) {
        const proj: ProjectData = projectsData[index];
        let calcWidth: number;
        let calcHeight: number;
        let xPos: number;
        let yPos: number;
        let zPos: number;

        if (!isMobile) {
          const t = 5760;
          const r = 3100;
          const populatedAngle = 270;

          const minRadius = 2500;
          const maxRadius = 5500;
          const halfPopulateAngleRad = (populatedAngle / 2) * (Math.PI / 180);
          const circumference = 2 * Math.PI * minRadius;
          const usedCircumference = circumference * (populatedAngle / 360);
          const cylinderHeight = usedCircumference / (t / r);
          const scaleUpFactor = usedCircumference / t;

          const zScale = 1 + proj.z_position * 1.2;
          const baseCalcWidth = proj.width * scaleUpFactor * zScale;
          const baseCalcHeight =
            baseCalcWidth *
            (proj.image.dimensions.height / proj.image.dimensions.width);

          const horizontalOffset = baseCalcWidth / usedCircumference / 2;
          const verticalOffset = baseCalcHeight / cylinderHeight / 2;
          const horizontalPosition = proj.x_position / t + horizontalOffset;
          const verticalPosition = proj.y_position / r + verticalOffset;

          const radius = minRadius + (maxRadius - minRadius) * proj.z_position;
          const angle =
            -Math.PI / 2 +
            horizontalPosition * populatedAngle * (Math.PI / 180) -
            halfPopulateAngleRad;

          calcWidth = baseCalcWidth * designScale;
          calcHeight = baseCalcHeight * designScale;
          xPos = radius * Math.cos(angle) * designScale;
          zPos = radius * Math.sin(angle) * designScale;
          yPos = (0.5 - verticalPosition) * cylinderHeight * designScale;
        } else {
          const radius = activeRadius;
          const baseWidth = 900;
          const gap = 180;

          const aspectRatio =
            proj.image.dimensions.height / proj.image.dimensions.width;
          calcWidth = baseWidth;
          calcHeight = baseWidth * aspectRatio;

          const minAngleStep = 2 * Math.asin((baseWidth / 2 + gap) / radius);
          const columns = Math.max(1, Math.floor((Math.PI * 2) / minAngleStep));
          const rows = Math.ceil(projectsData.length / columns);
          const angleStep = (Math.PI * 2) / columns;

          const col = index % columns;
          const row = Math.floor(index / columns);
          const angle = col * angleStep;

          xPos = radius * Math.cos(angle);
          zPos = radius * Math.sin(angle);

          const verticalSpacing = baseWidth * maxAspect + gap;
          const staggerOffset = col % 2 === 0 ? verticalSpacing / 2 : 0;
          yPos = ((rows - 1) / 2 - row) * verticalSpacing - staggerOffset;
        }

        const imgTop = yPos + calcHeight / 2;
        const imgBottom = yPos - calcHeight / 2;

        if (imgTop > topBound) topBound = imgTop;
        if (imgBottom < bottomBound) bottomBound = imgBottom;

        mappedData.push({
          ...proj,
          id: proj.project.id,
          calcWidth,
          calcHeight,
          xPos,
          yPos,
          zPos,
          baseOpacity: proj.opacity ?? 1,
        });
      }

      return {
        layoutData: mappedData,
        topBoundary: topBound,
        bottomBoundary: bottomBound,
        galleryRadius: activeRadius,
      };
    }, [size.width, size.height, isMobile]);

  // Cinematic Entrance GSAP (One-Shot Guarded — immune to viewport resize/rotation reverts)
  useEffect(() => {
    if (!triggerIntro || introStarted.current) return;
    introStarted.current = true;

    const { camera: rawCamera, size: liveSize } = get();
    const camera = rawCamera as THREE.PerspectiveCamera;
    const mobileAtStart = liveSize.width < 768;

    const ctx = gsap.context(() => {
      const startFov = mobileAtStart ? 74 : 42;
      const startZ = mobileAtStart ? 4000 : 7000;

      camera.fov = startFov;
      camera.updateProjectionMatrix();
      camera.position.set(0, 0, startZ);

      gsap.to(camera.position, {
        z: 0,
        duration: 2.0,
        ease: "power3.out",
        onComplete: () => {
          setIsDiveComplete(true);
          onIntroCompleteRef.current?.();
        },
      });
    });

    return () => ctx.revert();
  }, [get, triggerIntro]);

  // Pointer Interaction Tracking (Desktop mouse only)
  useEffect(() => {
    if (isMobile) return;

    let initialized = false;
    let lastTime = performance.now();
    let lastX = 0;
    let lastY = 0;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;

      const currentTime = performance.now();
      if (!initialized) {
        lastX = e.clientX;
        lastY = e.clientY;
        lastTime = currentTime;
        initialized = true;
        return;
      }

      const deltaTime = (currentTime - lastTime) / 1000;
      if (deltaTime > 0) {
        rawVelX.current = (e.clientX - lastX) / deltaTime;
        rawVelY.current = (e.clientY - lastY) / deltaTime;
      }

      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        rawVelX.current = 0;
        rawVelY.current = 0;
      }, 100);

      lastX = e.clientX;
      lastY = e.clientY;
      lastTime = currentTime;
    };

    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isMobile]);

  useFrame((_, delta) => {
    // 3-Frame WebGL Warm-up Heuristic
    if (!readySignaled.current && onReadyRef.current) {
      frameCounter.current += 1;
      if (frameCounter.current >= 3) {
        readySignaled.current = true;
        onReadyRef.current();
      }
    }

    if (isMobile) return;

    const safeDelta = Math.min(delta, 0.1);
    const lerpAlpha = Math.min(1, 10 * safeDelta);

    smoothVelX.current = THREE.MathUtils.lerp(
      smoothVelX.current,
      rawVelX.current,
      lerpAlpha,
    );
    smoothVelY.current = THREE.MathUtils.lerp(
      smoothVelY.current,
      rawVelY.current,
      lerpAlpha,
    );

    globalCurveX.current = THREE.MathUtils.clamp(
      THREE.MathUtils.lerp(0, 0.2, Math.abs(smoothVelX.current) / 500),
      0,
      0.3,
    );

    globalTiltAngle.current = THREE.MathUtils.degToRad(
      Math.abs(smoothVelY.current) > 50
        ? THREE.MathUtils.clamp((smoothVelY.current / 100) * 30, -30, 30)
        : 0,
    );
  });

  useEffect(() => {
    if (onSelectProject) {
      onSelectProject(hoveredId);
    }
  }, [hoveredId, onSelectProject]);

  return (
    <group>
      <CameraController
        introCompleted={isDiveComplete}
        topBoundary={topBoundary}
        bottomBoundary={bottomBoundary}
        galleryRadius={galleryRadius}
      />
      {layoutData.map((data: CalculatedProjectData, index: number) => (
        <GalleryImage
          key={`${data.id}-${index}`}
          data={data}
          globalCurveX={globalCurveX}
          globalTiltAngle={globalTiltAngle}
          hoveredId={hoveredId}
          setHoveredId={setHoveredId}
          triggerIntro={triggerIntro}
        />
      ))}
    </group>
  );
}
