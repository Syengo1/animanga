import type { Metadata } from "next";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { QueryProvider } from "@/providers/query-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { RouteAwareLayout } from "@/components/layout/route-aware-layout";
import { getCurrentUser } from "@/lib/auth/session";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Animanga",
    template: "%s | Animanga",
  },
  description:
    "Kenya's anime and manga community for events, tickets, merchandise, and culture.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    // suppressHydrationWarning is strictly required by next-themes
    <html lang="en" suppressHydrationWarning>
      {/* Replaced hardcoded bg-background text-foreground with semantic Tailwind variables */}
      <body className="bg-background text-foreground antialiased transition-colors duration-300">
        <GoogleOAuthProvider
          clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""}
        >
          <QueryProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <AuthProvider initialUser={user}>
                <RouteAwareLayout>{children}</RouteAwareLayout>
              </AuthProvider>
            </ThemeProvider>
          </QueryProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
