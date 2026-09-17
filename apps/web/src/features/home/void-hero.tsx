import InteractiveSphereGallery from "@/components/canvas/InteractiveSphereGallery";
import ScrollIndicator from "@/components/canvas/ScrollIndicator";

export function VoidHero() {
  return (
    <section className="relative w-full h-[100svh] bg-black overflow-hidden">
      <InteractiveSphereGallery />
      <ScrollIndicator />
    </section>
  );
}
