import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingExcludes: {
    "/api/runtime/hardening": ["./next.config.ts"],
  },
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "127.0.0.1:3000",
        "*.app.github.dev",
        "*.github.dev",
        "pmfreak-mu.vercel.app",
      ],
    },
  },
};

export default nextConfig;
