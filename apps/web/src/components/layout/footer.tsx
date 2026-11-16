// C:\Projects\animanga-platform\apps\web\src\components\layout\footer.tsx
import Link from "next/link";
import {
  Flame,
  Tv,
  BookOpen,
  Ticket,
  ShieldCheck,
  Clock,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";

const ANIME_LINKS = [
  { label: "Anime Catalog", href: "/search/anime" },
  { label: "Currently Airing", href: "/anime/airing" },
  { label: "Popular This Season", href: "/anime/popular" },
  { label: "New Releases", href: "/anime/new-releases" },
  { label: "Upcoming Premieres", href: "/anime/upcoming" },
] as const;

const MANGA_LINKS = [
  { label: "Manga Catalog", href: "/search/manga" },
  { label: "Currently Publishing", href: "/manga/airing" },
  { label: "All-Time Popular", href: "/manga/popular" },
  { label: "Highest Rated", href: "/search/manga?sort=SCORE_DESC" },
  { label: "Light Novels", href: "/search/manga?format=NOVEL" },
] as const;

const PLATFORM_LINKS = [
  { label: "Events & Conventions", href: "/events" },
  { label: "Ticket Wallet", href: "/tickets" },
  { label: "Official Merch", href: "/merch" },
  { label: "Sign In", href: "/login" },
  { label: "Create Account", href: "/register" },
] as const;

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative z-20 border-t border-border bg-background overflow-hidden">
      {/* Subtle Top Ambient Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-48 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-primary/5 to-transparent"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-14 pb-10 relative z-10">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 pb-12 border-b border-border">
          {/* Brand & Platform Identity (5 Columns on Desktop) */}
          <div className="lg:col-span-5 flex flex-col items-start gap-4">
            <Link
              href="/"
              className="flex items-center gap-2.5 text-lg font-black tracking-tight text-foreground group"
            >
              <span className="flex size-9 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-105">
                <Flame className="size-5" />
              </span>
              <span className="text-xl tracking-tight">
                ANI<span className="text-primary">MANGA</span>
              </span>
            </Link>

            <p className="text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed max-w-sm">
              East Africa&apos;s premier anime and manga discovery engine. Track
              live broadcasts in EAT, explore deep catalog metadata, and secure
              cryptographically verified convention tickets.
            </p>

            {/* Platform Capability Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary/80 border border-border text-[11px] font-bold text-foreground/85">
                <Clock className="w-3.5 h-3.5 text-primary" />
                EAT (UTC+3) Sync
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary/80 border border-border text-[11px] font-bold text-foreground/85">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                Ed25519 Verified Tickets
              </span>
            </div>
          </div>

          {/* Navigation Columns (7 Columns on Desktop) */}
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
            {/* Column 1: Anime */}
            <div className="flex flex-col gap-3.5">
              <h3 className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-1.5">
                <Tv className="w-3.5 h-3.5 text-primary" />
                <span>Anime</span>
              </h3>
              <ul className="flex flex-col gap-2.5">
                {ANIME_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 2: Manga */}
            <div className="flex flex-col gap-3.5">
              <h3 className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-primary" />
                <span>Manga</span>
              </h3>
              <ul className="flex flex-col gap-2.5">
                {MANGA_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: Platform */}
            <div className="col-span-2 sm:col-span-1 flex flex-col gap-3.5">
              <h3 className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-1.5">
                <Ticket className="w-3.5 h-3.5 text-primary" />
                <span>Platform</span>
              </h3>
              <ul className="flex flex-col gap-2.5">
                {PLATFORM_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Developer Attribution */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p className="font-medium text-center sm:text-left">
            &copy; {currentYear} Animanga Platform. All rights reserved.
          </p>

          <div className="flex items-center gap-1.5 font-medium">
            <span>Designed &amp; Developed by</span>
            <a
              href="https://antonysyengo.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit Syengo's developer portfolio"
              className="group inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary hover:bg-primary/15 border border-border hover:border-primary/40 font-black text-foreground hover:text-primary transition-all duration-200"
            >
              <span>Syengo</span>

              <ArrowUpRight className="w-3 h-3 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
