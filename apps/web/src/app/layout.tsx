import type { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { QueryProvider } from "@/providers/query-provider";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Animanga",
    template: "%s | Animanga",
  },
  description:
    "Kenya's anime and manga community for events, tickets, merchandise, and culture.",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-white antialiased">
        <QueryProvider>
          <Navbar />
          <main>{children}</main>
        </QueryProvider>
      </body>
    </html>
  );
}
