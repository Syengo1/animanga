// C:\Projects\animanga-platform\apps\web\src\components\layout\newsletter-cta.tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function NewsletterCTA() {
  return (
    <section className="py-10 md:py-14 relative z-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center border border-primary/25 bg-card rounded-3xl p-8 md:p-10 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-primary/15 to-transparent pointer-events-none" />

          <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-3 relative z-10 text-foreground">
            Never miss a ticket drop.
          </h2>
          <p className="text-sm md:text-base text-muted-foreground mb-6 relative z-10 max-w-lg mx-auto">
            Join our newsletter for early access to convention tickets,
            exclusive merch drops, and seasonal premiere alerts.
          </p>

          <form className="flex flex-col sm:flex-row max-w-md mx-auto relative z-10 gap-2.5">
            <Input
              type="email"
              required
              aria-label="Email address"
              placeholder="Enter your email"
              className="h-11 bg-background border-border text-foreground focus-visible:ring-primary"
            />
            <Button type="submit" className="h-11 px-7 font-bold shrink-0">
              Subscribe
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}
