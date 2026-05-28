import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Active middleware entrypoint for Next.js 16.
// Migration to the proxy.ts convention should be done in a dedicated PR —
// see src/lib/auth/proxy-middleware-reference.ts for the target implementation.
export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|apple-icon.png|icon.png).*)",
  ],
};
