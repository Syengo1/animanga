"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export function RouteAwareLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Identify if the user is in the authentication flow
  const isAuthRoute =
    pathname?.startsWith("/login") || pathname?.startsWith("/register");

  if (isAuthRoute) {
    return (
      // Strict viewport lock: Exactly 100% of the dynamic viewport height, zero scrolling allowed
      <main className="w-full h-[100dvh] overflow-hidden bg-background selection:bg-primary selection:text-foreground">
        {children}
      </main>
    );
  }

  return (
    <>
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
