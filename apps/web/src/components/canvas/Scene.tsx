"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";

export default function Scene({ children }: { children?: React.ReactNode }) {
  return (
    // 1. Changed `bg-black` to `bg-transparent` so the Sparkles layer underneath is visible
    <div className="w-full h-full absolute inset-0 z-10 bg-transparent overscroll-none">
      <Canvas
        camera={{ position: [0, 0, 7000], fov: 50, near: 10, far: 15000 }}
        gl={{
          antialias: true,
          alpha: true, // 2. CRITICAL: Enabled WebGL alpha transparency
          powerPreference: "high-performance",
          stencil: false,
          depth: true,
        }}
        dpr={[1, 2]}
      >
        {/* The black fog stays. It perfectly fades the 3D planes into the 2D black background */}
        <fog attach="fog" args={["#000000", 3000, 9000]} />
        <Suspense fallback={null}>{children}</Suspense>
      </Canvas>
    </div>
  );
}
