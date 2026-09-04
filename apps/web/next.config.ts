import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. NETWORK FIX: Whitelists local IPs to allow Mobile/LAN testing without Turbopack blocking assets
  allowedDevOrigins: ["192.168.100.22", "192.168.56.1", "localhost"],

  experimental: {
    serverActions: {
      // 2. CSRF FIX: Allows Server Actions (e.g., adding to cart, forms) to be triggered from network IPs
      allowedOrigins: [
        "192.168.100.22:3000",
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
};

export default nextConfig;
