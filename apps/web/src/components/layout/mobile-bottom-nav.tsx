// C:\Projects\animanga-platform\apps\web\src\components\layout\mobile-bottom-nav.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, Bookmark, Ticket, User } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";

export function MobileBottomNav() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const isHomePage = pathname === "/";

  const [showOnHome, setShowOnHome] = useState(false);
  const [prevIsHomePage, setPrevIsHomePage] = useState(isHomePage);
  if (prevIsHomePage !== isHomePage) {
    setPrevIsHomePage(isHomePage);
    if (isHomePage) {
      setShowOnHome(false);
    }
  }

  useEffect(() => {
    if (!isHomePage) return;

    const evaluateHeroScroll = () => {
      const heroEl = document.getElementById("void-hero-section");
      if (!heroEl) {
        setShowOnHome(window.scrollY > 240);
        return;
      }
      const rect = heroEl.getBoundingClientRect();
      // Reveal the bottom nav once more than ~45% of the hero has scrolled past the top
      setShowOnHome(rect.bottom <= rect.height * 0.55);
    };

    const heroEl = document.getElementById("void-hero-section");
    let observer: IntersectionObserver | undefined;

    if (heroEl && typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        ([entry]) => {
          const rect = entry.boundingClientRect;
          setShowOnHome(rect.bottom <= rect.height * 0.55);
        },
        { threshold: [0, 0.25, 0.45, 0.55, 0.75, 1] },
      );
      observer.observe(heroEl);
    }

    window.addEventListener("scroll", evaluateHeroScroll, { passive: true });
    window.addEventListener("resize", evaluateHeroScroll, { passive: true });
    const initTimer = window.setTimeout(evaluateHeroScroll, 0);

    return () => {
      window.clearTimeout(initTimer);
      observer?.disconnect();
      window.removeEventListener("scroll", evaluateHeroScroll);
      window.removeEventListener("resize", evaluateHeroScroll);
    };
  }, [isHomePage]);

  const isVisible = !isHomePage || showOnHome;

  const items = [
    {
      href: "/",
      label: "Home",
      icon: Home,
      isActive: pathname === "/",
    },
    {
      href: "/search/anime",
      label: "Explore",
      icon: Compass,
      isActive:
        pathname?.startsWith("/search") ||
        pathname?.startsWith("/anime") ||
        pathname?.startsWith("/manga"),
    },
    {
      href: "/library",
      label: "My List",
      icon: Bookmark,
      isActive: pathname?.startsWith("/library"),
    },
    {
      href: "/tickets",
      label: "Wallet",
      icon: Ticket,
      isActive: pathname?.startsWith("/tickets"),
    },
    {
      href: isAuthenticated ? "/dashboard" : "/login",
      label: isAuthenticated ? "Dashboard" : "Sign In",
      icon: User,
      isActive:
        pathname?.startsWith("/dashboard") ||
        pathname?.startsWith("/settings") ||
        pathname?.startsWith("/login"),
    },
  ] as const;

  return (
    <nav
      aria-label="Mobile bottom navigation"
      aria-hidden={!isVisible}
      className={cn(
        "fixed bottom-0 inset-x-0 z-50 min-h-16 pb-[env(safe-area-inset-bottom)] border-t border-border bg-card/90 backdrop-blur-2xl md:hidden px-2 transition-all duration-300 ease-out",
        isVisible
          ? "translate-y-0 opacity-100 pointer-events-auto"
          : "translate-y-full opacity-0 pointer-events-none",
      )}
    >
      <div className="grid h-16 grid-cols-5 items-center">
        {items.map(({ href, label, icon: Icon, isActive }) => (
          <Link
            key={label}
            href={href}
            tabIndex={isVisible ? 0 : -1}
            className={cn(
              "relative flex flex-col items-center justify-center gap-1 h-full text-[10px] font-bold transition-colors",
              isActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {isActive && (
              <span className="absolute top-0 w-8 h-0.5 rounded-full bg-primary" />
            )}
            <Icon
              className={cn(
                "w-4 h-4",
                isActive && "scale-110 transition-transform",
              )}
            />
            <span className="truncate max-w-[64px]">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
