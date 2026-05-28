// Next.js 16 convention: middleware.ts is deprecated in favour of proxy.ts.
// The full proxy implementation is in src/lib/auth/proxy-middleware-reference.ts.
// Do not add a proxy.ts at / or /src while this file exists — having both
// causes a build error ("Both middleware and proxy detected").
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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
