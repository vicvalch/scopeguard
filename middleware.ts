// All middleware logic lives in src/proxy.ts. This file is intentionally thin.
export { proxy as middleware } from "@/proxy";

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|apple-icon.png|icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
