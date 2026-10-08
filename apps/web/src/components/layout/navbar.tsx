"use client";

import Link from "next/link";
import { Flame, Menu, ShoppingBag, Ticket, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle"; // <-- Inject Toggle

const navigation = [
  { href: "/events", label: "Events", icon: Ticket },
  { href: "/merch", label: "Merch", icon: ShoppingBag },
] as const;

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    // FIX: Replaced bg-background/70 with bg-background/80 and border-border with border-border
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl transition-colors duration-300">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-bold tracking-tight"
          onClick={() => setIsOpen(false)}
        >
          {/* FIX: Semantic borders/backgrounds */}
          <span className="flex size-9 items-center justify-center rounded-xl border border-foreground/10 bg-foreground/5">
            <Flame className="size-5" />
          </span>
          <span>
            Ani<span className="opacity-60">manga</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navigation.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-sm text-foreground/70 transition-colors hover:text-foreground"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          <Link
            href="/login"
            className="rounded-full px-4 py-2 text-sm text-foreground/75 transition-colors hover:text-foreground"
          >
            Sign in
          </Link>
          <Link
            href="/tickets"
            className="rounded-full border border-border bg-foreground px-4 py-2 text-sm font-medium text-background transition-transform hover:scale-[1.02]"
          >
            Wallet
          </Link>
        </div>

        <button
          type="button"
          aria-label={isOpen ? "Close menu" : "Open menu"}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((open) => !open)}
          className="rounded-lg p-2 text-foreground/80 transition-colors hover:bg-foreground/10 hover:text-foreground md:hidden"
        >
          {isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <div
        className={cn(
          "overflow-hidden border-t border-border bg-background transition-[max-height,opacity] duration-200 md:hidden",
          isOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 sm:px-6">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-foreground/75 transition-colors hover:bg-foreground/5 hover:text-foreground"
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
          <div className="px-3 py-2 flex items-center justify-between border-t border-border mt-2 pt-4">
            <span className="text-sm font-medium text-foreground/75">
              Theme
            </span>
            <ThemeToggle />
          </div>
          <Link
            href="/login"
            onClick={() => setIsOpen(false)}
            className="mt-2 rounded-xl px-3 py-3 text-sm text-foreground/75 transition-colors hover:bg-foreground/5 hover:text-foreground"
          >
            Sign in
          </Link>
          <Link
            href="/tickets"
            onClick={() => setIsOpen(false)}
            className="rounded-xl bg-foreground px-3 py-3 text-center text-sm font-medium text-background"
          >
            Ticket Wallet
          </Link>
        </nav>
      </div>
    </header>
  );
}
