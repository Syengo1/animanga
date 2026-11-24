// C:\Projects\animanga-platform\apps\web\src\components\layout\navbar.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Flame,
  Menu,
  ShoppingBag,
  Ticket,
  Tv,
  BookOpen,
  X,
  LogOut,
  Search,
  Bookmark,
  LayoutDashboard,
  Settings,
  ChevronDown,
  Heart,
  ShieldCheck,
  CalendarClock,
} from "lucide-react";
import { useScheduleDrawer } from "@/features/schedule/schedule-context";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuth } from "@/providers/auth-provider";

const navigation = [
  { href: "/search/anime", label: "Anime", icon: Tv },
  { href: "/search/manga", label: "Manga", icon: BookOpen },
  { href: "/events", label: "Events", icon: Ticket },
  { href: "/merch", label: "Merch", icon: ShoppingBag },
] as const;

const userMenuLinks = [
  { href: "/dashboard", label: "Overview Dashboard", icon: LayoutDashboard },
  { href: "/library", label: "My Library & Watchlist", icon: Bookmark },
  { href: "/library?tab=FAVORITES", label: "Favorites", icon: Heart },
  { href: "/tickets", label: "Ticket Wallet", icon: Ticket },
  { href: "/settings", label: "Account Settings", icon: Settings },
] as const;

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [quickSearch, setQuickSearch] = useState("");
  const userMenuRef = useRef<HTMLDivElement>(null);

  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuth();

  const { isOpen: isScheduleOpen, toggleSchedule } = useScheduleDrawer();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = quickSearch.trim();
    const targetBase = pathname?.startsWith("/search/manga")
      ? "/search/manga"
      : "/search/anime";
    if (!trimmed) {
      router.push(targetBase);
      return;
    }
    router.push(`${targetBase}?q=${encodeURIComponent(trimmed)}`);
    setIsMobileMenuOpen(false);
  };

  const displayHandle =
    user?.username || user?.email?.split("@")[0] || "Member";
  const avatarInitial = displayHandle.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-xl transition-colors duration-300">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Left: Brand + Primary Navigation */}
        <div className="flex items-center gap-7">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-lg font-black tracking-tight text-foreground shrink-0 group"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <span className="flex size-9 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary transition-transform group-hover:scale-105">
              <Flame className="size-5" />
            </span>
            <span>
              ANI<span className="text-primary">MANGA</span>
            </span>
          </Link>

          <nav
            aria-label="Main Navigation"
            className="hidden items-center gap-1 lg:flex"
          >
            {navigation.map(({ href, label, icon: Icon }) => {
              const isActive = pathname?.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold transition-all",
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/70",
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                </Link>
              );
            })}

            <button
              type="button"
              onClick={toggleSchedule}
              aria-expanded={isScheduleOpen}
              className={cn(
                "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer",
                isScheduleOpen
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/70",
              )}
            >
              <CalendarClock className="w-3.5 h-3.5 text-primary" />
              <span>Schedule</span>
            </button>
          </nav>
        </div>

        {/* Center-Right: Quick Search Bar (Desktop & Tablet) */}
        <form
          onSubmit={handleQuickSearch}
          className="hidden md:flex items-center relative flex-1 max-w-xs lg:max-w-sm"
        >
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3.5 pointer-events-none" />
          <input
            type="search"
            value={quickSearch}
            onChange={(e) => setQuickSearch(e.target.value)}
            placeholder="Quick search anime or manga..."
            aria-label="Quick search anime or manga"
            className="w-full h-9 pl-9 pr-3 rounded-full bg-secondary/80 border border-border text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-card transition-all"
          />
        </form>

        {/* Right: Desktop & Tablet Actions */}
        <div className="hidden items-center gap-2.5 md:flex">
          <ThemeToggle />

          {isAuthenticated ? (
            <>
              <Link
                href="/library"
                title="My Library & Favorites"
                className={cn(
                  "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold border transition-all",
                  pathname?.startsWith("/library")
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-secondary/80 text-foreground border-border hover:bg-accent",
                )}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>My List</span>
              </Link>

              <Link
                href="/tickets"
                className={cn(
                  "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold border transition-all",
                  pathname?.startsWith("/tickets")
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-secondary/80 text-foreground border-border hover:bg-accent",
                )}
              >
                <Ticket className="w-3.5 h-3.5" />
                <span>Wallet</span>
              </Link>

              {/* Interactive User Profile Dropdown */}
              <div ref={userMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen((prev) => !prev)}
                  aria-expanded={isUserMenuOpen}
                  aria-label="Open account menu"
                  className="inline-flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full bg-card border border-border hover:border-primary/40 transition-all cursor-pointer shadow-xs"
                >
                  <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-black">
                    {avatarInitial}
                  </span>
                  <span className="text-xs font-bold text-foreground max-w-[100px] truncate">
                    @{displayHandle}
                  </span>
                  <ChevronDown
                    className={cn(
                      "w-3.5 h-3.5 text-muted-foreground transition-transform duration-200",
                      isUserMenuOpen && "rotate-180",
                    )}
                  />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 top-[calc(100%+8px)] w-64 rounded-2xl bg-popover border border-border shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="px-3 py-2.5 border-b border-border mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-black text-foreground truncate">
                          @{displayHandle}
                        </p>
                        <ShieldCheck className="w-3.5 h-3.5 text-success shrink-0" />
                      </div>
                      <p className="text-[11px] font-medium text-muted-foreground truncate mt-0.5">
                        {user?.email}
                      </p>
                    </div>

                    <div className="flex flex-col gap-0.5">
                      {userMenuLinks.map(({ href, label, icon: Icon }) => (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-foreground/85 hover:text-foreground hover:bg-accent transition-colors"
                        >
                          <Icon className="w-4 h-4 text-primary" />
                          <span>{label}</span>
                        </Link>
                      ))}
                    </div>

                    <div className="border-t border-border mt-1.5 pt-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          void logout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-destructive hover:bg-destructive/10 transition-colors cursor-pointer text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full px-4 py-2 text-xs sm:text-sm font-bold text-muted-foreground transition-colors hover:text-foreground"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-primary px-4 py-2 text-xs sm:text-sm font-bold text-primary-foreground shadow-xs transition-transform hover:scale-[1.02] hover:bg-primary/90"
              >
                Join Free
              </Link>
            </>
          )}
        </div>

        {/* Mobile Top Bar Actions */}
        <div className="flex items-center gap-1.5 md:hidden">
          <button
            type="button"
            onClick={() => {
              setIsMobileMenuOpen(false);
              toggleSchedule();
            }}
            aria-label="Open episode release schedule"
            aria-expanded={isScheduleOpen}
            className={cn(
              "relative inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-bold border transition-colors cursor-pointer",
              isScheduleOpen
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary/80 text-foreground border-border hover:bg-accent",
            )}
          >
            <CalendarClock className="size-4 text-primary" />
            <span>Schedule</span>
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          </button>
          <ThemeToggle />
          <button
            type="button"
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            className="rounded-xl p-2 text-foreground/85 transition-colors hover:bg-accent hover:text-foreground"
          >
            {isMobileMenuOpen ? (
              <X className="size-5" />
            ) : (
              <Menu className="size-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      <div
        className={cn(
          "overflow-hidden border-t border-border bg-background transition-[max-height,opacity] duration-200 md:hidden",
          isMobileMenuOpen ? "max-h-[520px] opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4">
          <form
            onSubmit={handleQuickSearch}
            className="relative flex items-center"
          >
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 pointer-events-none" />
            <input
              type="search"
              value={quickSearch}
              onChange={(e) => setQuickSearch(e.target.value)}
              placeholder="Search anime or manga..."
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-secondary border border-border text-xs font-semibold text-foreground"
            />
          </form>

          <nav
            aria-label="Mobile Navigation"
            className="grid grid-cols-2 gap-1.5"
          >
            {navigation.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-bold bg-card border border-border text-foreground/90 hover:bg-accent"
              >
                <Icon className="size-4 text-primary" />
                {label}
              </Link>
            ))}
          </nav>

          {isAuthenticated ? (
            <div className="border-t border-border pt-3 flex flex-col gap-1">
              <div className="px-2 pb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-black">
                    {avatarInitial}
                  </span>
                  <span className="text-xs font-black text-foreground">
                    @{displayHandle}
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground truncate max-w-[160px]">
                  {user?.email}
                </span>
              </div>

              {userMenuLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-foreground/85 hover:bg-accent"
                >
                  <Icon className="size-4 text-primary" />
                  <span>{label}</span>
                </Link>
              ))}

              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  void logout();
                }}
                className="mt-1 flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-destructive hover:bg-destructive/10 text-left"
              >
                <LogOut className="size-4" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="border-t border-border pt-3 grid grid-cols-2 gap-2">
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-xl border border-border bg-card px-3 py-2.5 text-center text-xs font-bold text-foreground hover:bg-accent"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-xl bg-primary px-3 py-2.5 text-center text-xs font-bold text-primary-foreground"
              >
                Create Account
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
