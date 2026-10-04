"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";

export default function Scene({ children }: { children?: React.ReactNode }) {
  // Removed `touch-none` to prevent interference with mobile page scrolling
  return (
    <div className="w-full h-full absolute inset-0 z-10 bg-black overscroll-none">
      <Canvas
        camera={{ position: [0, 0, 7000], fov: 50, near: 10, far: 15000 }}
        gl={{
          antialias: true,
          alpha: false,
          // Prompts browser to favor dedicated GPU (Monitor battery impact on mobile)
          powerPreference: "high-performance",
          stencil: false,
          depth: true,
        }}
        // Caps pixel ratio at 2x to save fillrate on high-density displays
        dpr={[1, 2]}
      >
        <fog attach="fog" args={["#000000", 3000, 9000]} />
        <Suspense fallback={null}>{children}</Suspense>
      </Canvas>
    </div>
  );
}
