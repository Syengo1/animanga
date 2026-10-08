"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { useTheme } from "next-themes";

export default function Scene({ children }: { children?: React.ReactNode }) {
  const { resolvedTheme } = useTheme();

  // Dynamically match the fog color to globals.css background variables
  const fogColor = resolvedTheme === "light" ? "#fcfcfc" : "#0c0c0c";

  return (
    <div className="w-full h-full absolute inset-0 z-10 bg-transparent overscroll-none">
      <Canvas
        camera={{ position: [0, 0, 7000], fov: 50, near: 10, far: 15000 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
          stencil: false,
          depth: true,
        }}
        dpr={[1, 2]}
      >
        <fog attach="fog" args={[fogColor, 3000, 9000]} />
        <Suspense fallback={null}>{children}</Suspense>
      </Canvas>
    </div>
  );
}
