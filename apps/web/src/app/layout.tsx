import type { Metadata } from "next";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { QueryProvider } from "@/providers/query-provider";
import { AuthProvider } from "@/providers/auth-provider";
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
    <html lang="en">
      <body className="bg-black text-white antialiased">
        {/* Wrap providers with GoogleOAuthProvider */}
        <GoogleOAuthProvider
          clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""}
        >
          <QueryProvider>
            <AuthProvider initialUser={user}>
              <RouteAwareLayout>{children}</RouteAwareLayout>
            </AuthProvider>
          </QueryProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
