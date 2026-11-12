// C:\Projects\animanga-platform\apps\web\src\components\layout\navbar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Flame,
  Menu,
  ShoppingBag,
  Ticket,
  Tv,
  BookOpen,
  X,
  LogOut,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuth } from "@/providers/auth-provider";

const navigation = [
  { href: "/search/anime", label: "Anime", icon: Tv },
  { href: "/search/manga", label: "Manga", icon: BookOpen },
  { href: "/events", label: "Events", icon: Ticket },
  { href: "/merch", label: "Merch", icon: ShoppingBag },
] as const;

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-xl transition-colors duration-300">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-lg font-black tracking-tight text-foreground"
          onClick={() => setIsOpen(false)}
        >
          <span className="flex size-9 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
            <Flame className="size-5" />
          </span>
          <span>
            ANI<span className="text-primary">MANGA</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav
          aria-label="Main Navigation"
          className="hidden items-center gap-6 md:flex"
        >
          {navigation.map(({ href, label }) => {
            const isActive = pathname?.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "text-sm font-semibold transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          {isAuthenticated ? (
            <>
              <span className="text-xs font-medium text-muted-foreground max-w-[140px] truncate">
                {user?.email}
              </span>
              <button
                type="button"
                onClick={() => void logout()}
                className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold text-muted-foreground transition-colors hover:text-destructive cursor-pointer"
              >
                <LogOut className="size-3.5" />
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
          )}
          <Link
            href="/tickets"
            className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm transition-transform hover:scale-[1.02] hover:bg-primary/90"
          >
            Wallet
          </Link>
        </div>

        {/* Mobile Actions */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            aria-label={isOpen ? "Close menu" : "Open menu"}
            aria-expanded={isOpen}
            onClick={() => setIsOpen((open) => !open)}
            className="rounded-lg p-2 text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
          >
            {isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={cn(
          "overflow-hidden border-t border-border bg-background transition-[max-height,opacity] duration-200 md:hidden",
          isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <nav
          aria-label="Mobile Navigation"
          className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 sm:px-6"
        >
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
            >
              <Icon className="size-4 text-primary" />
              {label}
            </Link>
          ))}
          <div className="mt-2 border-t border-border pt-2 flex flex-col gap-1.5">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  void logout();
                }}
                className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/10 text-left"
              >
                <LogOut className="size-4" />
                Sign out ({user?.email})
              </button>
            ) : (
              <Link
                href="/login"
                onClick={() => setIsOpen(false)}
                className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
              >
                Sign in
              </Link>
            )}
            <Link
              href="/tickets"
              onClick={() => setIsOpen(false)}
              className="mt-1 block rounded-xl bg-primary px-3 py-2.5 text-center text-sm font-bold text-primary-foreground"
            >
              Ticket Wallet
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
