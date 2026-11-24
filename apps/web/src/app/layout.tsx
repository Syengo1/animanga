// C:\Projects\animanga-platform\apps\web\src\app\layout.tsx
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { QueryProvider } from "@/providers/query-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { ScheduleProvider } from "@/features/schedule/schedule-context";
import { ThemeProvider } from "@/providers/theme-provider";
import { RouteAwareLayout } from "@/components/layout/route-aware-layout";
import { getCurrentUser } from "@/lib/auth/session";
import { THEME_PALETTE } from "@/config/theme.config";
import "./globals.css";

const alkatraFont = localFont({
  src: "../../public/fonts/Alkatra-VariableFont_wght.woff2",
  variable: "--font-alkatra",
  weight: "400 700",
  display: "swap",
});

const SITE_URL =
  process.env.NEXT_PUBLIC_WEB_URL || "https://animangaweb.vercel.app";

export const viewport: Viewport = {
  themeColor: [
    {
      media: "(prefers-color-scheme: light)",
      color: THEME_PALETTE.light.background,
    },
    {
      media: "(prefers-color-scheme: dark)",
      color: THEME_PALETTE.dark.background,
    },
  ],
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Animanga | Discover Anime, Manga, Events & Merch",
    template: "%s | Animanga",
  },
  description:
    "East Africa's premier anime and manga platform. Track currently airing anime in EAT, explore top manga, book verified convention tickets, and shop official drops.",
  keywords: [
    "Anime",
    "Manga",
    "Anime Kenya",
    "Anime Conventions Nairobi",
    "Currently Airing Anime",
    "Manga Catalog",
    "Animanga",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_KE",
    url: SITE_URL,
    siteName: "Animanga",
    title: "Animanga | Your Universe of Anime & Manga",
    description:
      "Discover what's airing, explore the manga catalog, and secure cryptographic convention tickets.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Animanga | Your Universe of Anime & Manga",
    description:
      "Discover what's airing, explore the manga catalog, and secure cryptographic convention tickets.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: "Animanga",
        description:
          "Anime & Manga discovery engine, airing schedules, convention ticketing, and merchandise platform.",
        potentialAction: [
          {
            "@type": "SearchAction",
            target: {
              "@type": "EntryPoint",
              urlTemplate: `${SITE_URL}/search/anime?q={search_term_string}`,
            },
            "query-input": "required name=search_term_string",
          },
        ],
      },
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: "Animanga Platform",
        url: SITE_URL,
      },
    ],
  };

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={alkatraFont.variable}
    >
      <body className="bg-background text-foreground font-sans antialiased transition-colors duration-300 min-h-screen flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
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
                <ScheduleProvider>
                  <RouteAwareLayout>{children}</RouteAwareLayout>
                </ScheduleProvider>
              </AuthProvider>
            </ThemeProvider>
          </QueryProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
