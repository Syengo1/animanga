// C:\Projects\animanga-platform\apps\web\next.config.ts
import type { NextConfig } from "next";

const apiBaseUrl = (
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3001"
).replace("localhost", "127.0.0.1");

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "192.168.100.5",
    "192.168.56.1",
    "localhost",
    "127.0.0.1",
  ],

  experimental: {
    serverActions: {
      allowedOrigins: [
        "192.168.100.5:3000",
        "192.168.56.1:3000",
        "localhost:3000",
        "127.0.0.1:3000",
      ],
    },
  },

  images: {
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
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
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
