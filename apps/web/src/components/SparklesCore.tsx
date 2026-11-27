// C:\Projects\animanga-platform\apps\web\src\components\SparklesCore.tsx
"use client";

import React, { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

type ParticlesProps = {
  id?: string;
  className?: string;
  background?: string;
  minSize?: number;
  maxSize?: number;
  speed?: number;
  particleSpeed?: number;
  particleColor?: string;
  particleDensity?: number;
  paused?: boolean;
  children?: React.ReactNode;
};

const hexToRgb = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
};

export const SparklesCore = (props: ParticlesProps) => {
  const {
    className,
    background = "transparent",
    minSize = 0.5,
    maxSize = 1,
    speed = 0.5,
    particleSpeed = 0.5,
    particleColor = "#ffffff",
    particleDensity = 0.5,
    paused = false,
    children,
  } = props;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (paused) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationFrameId = 0;
    let viewportWidth = 1;
    let viewportHeight = 1;

    type Particle = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      opacity: number;
      opacityVel: number;
    };

    let particles: Particle[] = [];

    const mappedDensity =
      5 + ((Math.max(0.1, Math.min(1, particleDensity)) - 0.1) / 0.9) * 55;
    const flickerSpeed =
      0.5 + ((Math.max(0.1, Math.min(1, speed)) - 0.1) / 0.9) * 11.5;
    const rgbColor = particleColor.startsWith("#")
      ? hexToRgb(particleColor)
      : particleColor;

    const initParticles = (width: number, height: number) => {
      const area = width * height;
      const count = Math.floor((area / 10000) * mappedDensity);
      const baseVelocity = particleSpeed * 0.5;

      particles = [];
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * baseVelocity,
          vy: (Math.random() - 0.5) * baseVelocity,
          size: minSize + Math.random() * (maxSize - minSize),
          opacity: Math.random(),
          opacityVel: (Math.random() - 0.5) * 0.04,
        });
      }
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      viewportWidth = container.clientWidth || container.offsetWidth || 1;
      viewportHeight = container.clientHeight || container.offsetHeight || 1;

      canvas.width = Math.floor(viewportWidth * dpr);
      canvas.height = Math.floor(viewportHeight * dpr);
      canvas.style.width = `${viewportWidth}px`;
      canvas.style.height = `${viewportHeight}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initParticles(viewportWidth, viewportHeight);
    };

    const render = () => {
      ctx.clearRect(0, 0, viewportWidth, viewportHeight);

      if (background !== "transparent") {
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, viewportWidth, viewportHeight);
      }

      ctx.fillStyle = `rgb(${rgbColor})`;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = viewportWidth;
        if (p.x > viewportWidth) p.x = 0;
        if (p.y < 0) p.y = viewportHeight;
        if (p.y > viewportHeight) p.y = 0;

        p.opacity += p.opacityVel * flickerSpeed * 0.5;
        if (p.opacity <= 0.1 || p.opacity >= 1) {
          p.opacityVel *= -1;
        }
        p.opacity = Math.max(0.1, Math.min(1, p.opacity));

        ctx.globalAlpha = p.opacity;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1.0;
      animationFrameId = requestAnimationFrame(render);
    };

    window.addEventListener("resize", resize, { passive: true });
    resize();
    render();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [
    paused,
    background,
    minSize,
    maxSize,
    speed,
    particleSpeed,
    particleColor,
    particleDensity,
  ]);

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5 }}
      className={cn("relative w-full h-full overflow-hidden", className)}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block pointer-events-none"
      />
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
        {children}
      </div>
    </motion.div>
  );
};
