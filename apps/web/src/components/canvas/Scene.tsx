// C:\Projects\animanga-platform\apps\web\src\components\canvas\Scene.tsx
"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { useTheme } from "next-themes";
import { getThemeTokens } from "@/config/theme.config";

interface SceneProps {
  children?: React.ReactNode;
  isVisible?: boolean;
}

export default function Scene({ children, isVisible = true }: SceneProps) {
  const { resolvedTheme } = useTheme();
  const { fogColor } = getThemeTokens(resolvedTheme);

  return (
    <div className="w-full h-full absolute inset-0 z-10 bg-transparent overscroll-none">
      <Canvas
        frameloop={isVisible ? "always" : "never"}
        camera={{ position: [0, 0, 7000], fov: 50, near: 10, far: 15000 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
          stencil: false,
          depth: true,
        }}
        dpr={[1, 2]}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener(
            "webglcontextlost",
            (event) => event.preventDefault(),
            false,
          );
        }}
      >
        <fog attach="fog" args={[fogColor, 3000, 9000]} />
        <Suspense fallback={null}>{children}</Suspense>
      </Canvas>
    </div>
  );
}
