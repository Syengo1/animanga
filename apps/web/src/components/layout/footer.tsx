import { Flame } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black/50 py-12 relative z-20">
      <div className="container mx-auto px-4 text-center text-muted-foreground">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Flame className="w-5 h-5 text-primary" />
          <span className="font-black text-foreground">ANIMANGA</span>
        </div>
        <p className="text-sm">
          Built with Next.js & NestJS. Cryptographically secured.
        </p>
        <p className="text-xs mt-2 opacity-50">
          © 2026 Animanga Platform. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
