// C:\Projects\animanga-platform\apps\web\src\components\layout\mobile-bottom-nav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, Bookmark, Ticket, User } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";

export function MobileBottomNav() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

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
      className="fixed bottom-0 inset-x-0 z-50 h-16 border-t border-border bg-card/90 backdrop-blur-2xl md:hidden px-2"
    >
      <div className="grid h-full grid-cols-5 items-center">
        {items.map(({ href, label, icon: Icon, isActive }) => (
          <Link
            key={label}
            href={href}
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
