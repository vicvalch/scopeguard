/**
 * Runtime-accessible configuration constants.
 *
 * Do NOT import next.config.ts or any project root config file from
 * app routes, server actions, or runtime modules. Place any values
 * that need to be readable at request time here instead.
 */

export const ALLOWED_ORIGINS = [
  "localhost:3000",
  "127.0.0.1:3000",
  "*.app.github.dev",
  "*.github.dev",
  "pmfreak-mu.vercel.app",
] as const;

export type AllowedOrigin = (typeof ALLOWED_ORIGINS)[number];
