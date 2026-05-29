import type { NextConfig } from "next";
import { ALLOWED_ORIGINS } from "./src/lib/config/runtime";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [...ALLOWED_ORIGINS],
    },
  },
  // Prevent NFT from tracing the Next.js config file itself into
  // app-route or middleware bundles. Without this exclusion, Turbopack's
  // file tracer picks up next.config.ts from any route that uses
  // process.cwd()-based fs checks (e.g. runtime-hardening modules),
  // which confuses the middleware NFT artifact generation.
  outputFileTracingExcludes: {
    "**": [
      "./next.config.ts",
      "./next.config.js",
      "./next.config.mjs",
    ],
  },
};

export default nextConfig;
