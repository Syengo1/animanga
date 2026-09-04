"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";

export default function Scene({ children }: { children?: React.ReactNode }) {
  return (
    <div className="w-full h-full absolute inset-0 z-10 bg-black overscroll-none touch-none">
      <Canvas
        camera={{ position: [0, 0, 7000], fov: 50, near: 10, far: 15000 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
      >
        <fog attach="fog" args={["#000000", 3000, 9000]} />
        <Suspense fallback={null}>{children}</Suspense>
      </Canvas>
    </div>
  );
}
