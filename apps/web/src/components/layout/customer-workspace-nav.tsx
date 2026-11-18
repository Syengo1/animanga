// C:\Projects\animanga-platform\apps\web\src\components\layout\customer-workspace-nav.tsx
"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  LayoutDashboard,
  Bookmark,
  Heart,
  Ticket,
  Settings,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";

const WORKSPACE_LINKS = [
  {
    href: "/dashboard",
    label: "Overview",
    description: "Airing radar & stats",
    icon: LayoutDashboard,
  },
  {
    href: "/library",
    label: "My Library",
    description: "Watchlist & reading list",
    icon: Bookmark,
  },
  {
    href: "/library?tab=FAVORITES",
    label: "Favorites",
    description: "Pinned top titles",
    icon: Heart,
  },
  {
    href: "/tickets",
    label: "Ticket Wallet",
    description: "QR passes & conventions",
    icon: Ticket,
  },
  {
    href: "/settings",
    label: "Settings & KYC",
    description: "Profile, security & organizer",
    icon: Settings,
  },
] as const;

function WorkspaceNavInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const isFavoritesTab =
    pathname === "/library" && searchParams.get("tab") === "FAVORITES";

  const handle = user?.username || user?.email?.split("@")[0] || "member";
  const initial = handle.charAt(0).toUpperCase();
  const fullName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || `@${handle}`;

  const checkActive = (href: string) => {
    if (href.includes("?tab=FAVORITES")) return isFavoritesTab;
    if (href === "/library") return pathname === "/library" && !isFavoritesTab;
    return pathname === href || pathname?.startsWith(`${href}/`);
  };

  return (
    <>
      {/* Desktop Sticky Sidebar Rail */}
      <aside className="hidden lg:flex lg:w-64 shrink-0 flex-col gap-5">
        <div className="p-5 rounded-2xl bg-card border border-border shadow-xs relative overflow-hidden">
          <div className="pointer-events-none absolute -top-10 -right-10 w-28 h-28 rounded-full bg-primary/15 blur-2xl" />
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-lg font-black shadow-sm shrink-0">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-black text-foreground truncate">
                  {fullName}
                </p>
                <ShieldCheck className="w-4 h-4 text-success shrink-0" />
              </div>
              <p className="text-xs font-bold text-primary truncate">
                @{handle}
              </p>
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                {user?.email}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-[11px] font-bold text-muted-foreground">
            <span className="inline-flex items-center gap-1 text-foreground">
              <Sparkles className="w-3 h-3 text-primary" />
              Verified Member
            </span>
            <span>EAT (UTC+3)</span>
          </div>
        </div>

        <nav
          aria-label="Customer Workspace Navigation"
          className="flex flex-col gap-1.5 p-2 rounded-2xl bg-card border border-border shadow-xs"
        >
          {WORKSPACE_LINKS.map(({ href, label, description, icon: Icon }) => {
            const isActive = checkActive(href);

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all group",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-foreground/85 hover:bg-secondary/80 hover:text-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4 shrink-0",
                    isActive
                      ? "text-primary-foreground"
                      : "text-primary group-hover:scale-105 transition-transform",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold leading-tight">{label}</p>
                  <p
                    className={cn(
                      "text-[10px] truncate mt-0.5",
                      isActive
                        ? "text-primary-foreground/80"
                        : "text-muted-foreground",
                    )}
                  >
                    {description}
                  </p>
                </div>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile & Tablet Constrained Horizontal Pill Bar */}
      <div className="lg:hidden w-full max-w-full min-w-0 overflow-hidden border-b border-border pb-2.5 mb-1">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full">
          {WORKSPACE_LINKS.map(({ href, label, icon: Icon }) => {
            const isActive = checkActive(href);

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border shrink-0 transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-card text-muted-foreground border-border hover:text-foreground",
                )}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}

export function CustomerWorkspaceNav() {
  return (
    <Suspense fallback={null}>
      <WorkspaceNavInner />
    </Suspense>
  );
}
