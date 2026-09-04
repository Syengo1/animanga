"use client";

import Link from "next/link";
import { Flame, Menu, ShoppingBag, Ticket, X } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

const navigation = [
  {
    href: "/events",
    label: "Events",
    icon: Ticket,
  },
  {
    href: "/merch",
    label: "Merch",
    icon: ShoppingBag,
  },
] as const;

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-bold tracking-tight"
          onClick={() => setIsOpen(false)}
        >
          <span className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5">
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
              className="text-sm text-white/70 transition-colors hover:text-white"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="rounded-full px-4 py-2 text-sm text-white/75 transition-colors hover:text-white"
          >
            Sign in
          </Link>

          <Link
            href="/tickets"
            className="rounded-full border border-white/10 bg-white px-4 py-2 text-sm font-medium text-black transition-transform hover:scale-[1.02]"
          >
            Wallet
          </Link>
        </div>

        <button
          type="button"
          aria-label={isOpen ? "Close menu" : "Open menu"}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((open) => !open)}
          className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white md:hidden"
        >
          {isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      <div
        className={cn(
          "overflow-hidden border-t border-white/10 transition-[max-height,opacity] duration-200 md:hidden",
          isOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 sm:px-6">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-white/75 transition-colors hover:bg-white/5 hover:text-white"
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}

          <Link
            href="/login"
            onClick={() => setIsOpen(false)}
            className="mt-2 rounded-xl px-3 py-3 text-sm text-white/75 transition-colors hover:bg-white/5 hover:text-white"
          >
            Sign in
          </Link>

          <Link
            href="/tickets"
            onClick={() => setIsOpen(false)}
            className="rounded-xl bg-white px-3 py-3 text-center text-sm font-medium text-black"
          >
            Ticket Wallet
          </Link>
        </nav>
      </div>
    </header>
  );
}
