import InteractiveSphereGallery from "@/components/canvas/InteractiveSphereGallery";
import ScrollIndicator from "@/components/canvas/ScrollIndicator";
import { SparklesCore } from "@/components/SparklesCore";

export function VoidHero() {
  return (
    <section className="relative w-full h-[100svh] bg-black overflow-hidden">
      <SparklesCore
        id="void-hero-sparkles"
        background="transparent"
        minSize={1.5}
        maxSize={1}
        particleDensity={0.1}
        particleSpeed={0.2}
        speed={0.5}
        particleColor="#9ba1a5"
        className="absolute inset-0 w-full h-full"
      >
        {/* 3D WebGL Scene and UI Overlays */}
        <InteractiveSphereGallery />
        <ScrollIndicator />
      </SparklesCore>
    </section>
  );
}
