import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. NETWORK FIX: Whitelists local IPs to allow Mobile/LAN testing without Turbopack blocking assets
  allowedDevOrigins: ["192.168.100.5", "192.168.56.1", "localhost"],

  experimental: {
    serverActions: {
      // 2. CSRF FIX: Allows Server Actions (e.g., adding to cart, forms) to be triggered from network IPs
      allowedOrigins: [
        "192.168.100.5:3000",
        "192.168.56.1:3000",
        "localhost:3000",
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

  // 3. API PROXY FIX: Offloads the reverse proxy from the Edge middleware to Node.js.
  // This securely catches all frontend fetch("/api/v1/...") calls and pipes them
  // straight to your NestJS backend on port 3001, completely preserving POST bodies.
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
