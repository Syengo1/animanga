// C:\Projects\animanga-platform\apps\web\next.config.ts
import type { NextConfig } from "next";

function cleanUrl(raw: string | undefined, fallback: string): string {
  const cleaned = (raw ?? fallback)
    .trim()
    .replace(/^["']|["']$/g, "")
    .trim()
    .replace("localhost", "127.0.0.1")
    .replace(/\/+$/, "");
  return cleaned || fallback;
}

function extractHost(rawUrl?: string): string | null {
  if (!rawUrl) return null;
  try {
    return new URL(rawUrl.trim().replace(/^["']|["']$/g, "")).host;
  } catch {
    return null;
  }
}

const apiBaseUrl = cleanUrl(
  process.env.NEXT_PUBLIC_API_URL,
  "http://127.0.0.1:3001",
);

const configuredWebHost = extractHost(process.env.NEXT_PUBLIC_WEB_URL);

const serverActionOrigins = Array.from(
  new Set(
    [
      "animangaweb.vercel.app",
      configuredWebHost,
      "192.168.100.5:3000",
      "192.168.56.1:3000",
      "localhost:3000",
      "127.0.0.1:3000",
    ].filter((origin): origin is string => Boolean(origin)),
  ),
);

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,

  allowedDevOrigins: [
    "192.168.100.5",
    "192.168.56.1",
    "localhost",
    "127.0.0.1",
  ],

  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
    serverActions: {
      allowedOrigins: serverActionOrigins,
    },
  },

  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "s4.anilist.co",
        pathname: "/**",
      },
    ],
  },

  async headers() {
    return [
      {
        // Immutable 1-year cache for all Sphere Gallery AVIF hero assets
        source: "/assets/hero/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Immutable 1-year cache for self-hosted Alkatra fonts
        source: "/fonts/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          {
            // Required for Google Identity Services OAuth popup flow
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
        ],
      },
    ];
  },

  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiBaseUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
