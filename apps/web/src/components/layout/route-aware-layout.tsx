// C:\Projects\animanga-platform\apps\web\src\components\layout\route-aware-layout.tsx
"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

export function RouteAwareLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isAuthRoute =
    pathname?.startsWith("/login") || pathname?.startsWith("/register");

  if (isAuthRoute) {
    return (
      <main className="relative w-full max-w-full h-[100dvh] overflow-hidden bg-background selection:bg-primary selection:text-primary-foreground">
        {children}
      </main>
    );
  }

  return (
    <div className="flex min-h-screen w-full max-w-full flex-col overflow-x-clip pb-16 md:pb-0">
      <Navbar />
      <main className="flex-1 w-full max-w-full min-w-0 overflow-x-clip">
        {children}
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
