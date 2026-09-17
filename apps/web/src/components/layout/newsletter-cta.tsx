import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function NewsletterCTA() {
  return (
    <section className="py-32 relative z-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center border border-primary/20 bg-primary/5 rounded-3xl p-12 relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-primary/20 to-transparent pointer-events-none" />
          <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4 relative z-10">
            Never miss a ticket drop.
          </h2>
          <p className="text-muted-foreground mb-8 relative z-10 max-w-lg mx-auto">
            Join our newsletter to get early access to convention tickets,
            exclusive merch drops, and community announcements.
          </p>
          <form className="flex max-w-md mx-auto relative z-10 gap-2">
            <Input
              type="email"
              placeholder="Enter your email"
              className="h-12 bg-background border-white/20 focus-visible:ring-primary"
            />
            <Button type="submit" className="h-12 px-8 font-bold">
              Subscribe
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}
