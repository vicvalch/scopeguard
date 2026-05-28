// MIGRATION REFERENCE — NOT AN ACTIVE NEXT.JS ENTRYPOINT
//
// This file is the target implementation for the future migration from
// middleware.ts to the Next.js 16 proxy.ts convention.
//
// DO NOT rename or move this file back to src/proxy.ts.
// Next.js 16 treats src/proxy.ts as a reserved entrypoint (the proxy
// convention that replaces middleware.ts), and having it present alongside
// middleware.ts causes Turbopack to emit conflicting build artifacts,
// breaking the Vercel build with:
//   ENOENT: no such file or directory, open '.next/server/middleware.js.nft.json'
//
// When ready to migrate, replace middleware.ts with this implementation
// under the src/proxy.ts path and delete middleware.ts.  That migration
// should happen in a dedicated, focused PR.

import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { resolvePostAuthDestination } from "@/lib/auth/resolve-post-auth-destination";
import { isSafeContinuationRoute } from "@/lib/auth/validate-continuation-route";
import {
  getRouteAccessPolicy,
  isAuthRoute,
  isInternalDebugRoute,
  isProtectedPageRoute,
  isSetupRoute,
  requiresOnboardingCompletion,
} from "@/lib/auth/route-policy-registry";

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const pathname = request.nextUrl.pathname;
  const policy = getRouteAccessPolicy(pathname);

  if (policy === "api") {
    return response;
  }

  if (isInternalDebugRoute(pathname) && process.env.NODE_ENV === "production") {
    return NextResponse.redirect(new URL("/workspace", request.url));
  }

  if (isProtectedPageRoute(pathname) && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user) {
    const onboardingCompleted = user.user_metadata?.onboarding_completed === true;

    if (isAuthRoute(pathname)) {
      const requestedRoute = request.nextUrl.searchParams.get("next");
      const decision = resolvePostAuthDestination({
        isAuthenticated: true,
        onboardingCompleted,
        requestedRoute,
        isRequestedRouteSafe: requestedRoute ? isSafeContinuationRoute(requestedRoute) : false,
      });

      return NextResponse.redirect(new URL(decision.destination, request.url));
    }

    if (isSetupRoute(pathname) && onboardingCompleted) {
      return NextResponse.redirect(new URL("/workspace", request.url));
    }

    if (requiresOnboardingCompletion(pathname) && !onboardingCompleted && pathname !== "/logout") {
      return NextResponse.redirect(new URL("/workspace/setup", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
