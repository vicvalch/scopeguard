// Single routing authority for pmfreak.
// All policy logic lives in src/proxy.ts — this file is the Next.js entrypoint only.
export { proxy as middleware, config } from "./proxy";
