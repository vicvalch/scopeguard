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

// ─── Migration reference — NOT the active middleware ─────────────────────────
//
// This file was previously at src/proxy.ts, which is a Next.js 16 convention
// level. Being there caused Vercel builds to treat it as the active proxy/
// middleware entry point, resulting in a missing middleware.js.nft.json error
// during Turbopack builds (Next.js 16 bug: NFT rename skipped for Turbopack).
//
// It has been moved here (out of the convention level) to fix that build error.
//
// ACTIVE MIDDLEWARE: middleware.ts at the repo root sets x-pathname only.
// ACTIVE AUTH GUARD: src/app/(protected)/layout.tsx enforces login + trial.
//
// FUTURE: When Next.js 16 proxy.ts support stabilises, this file shows the
// intended full middleware implementation. Before activating it (by placing a
// proxy.ts at /src or repo root), ensure:
// 1. /create-pmo is in SETUP_ROUTES (already done in route-policy-registry.ts)
//    so non-onboarded users can reach the wizard without being blocked.
// 2. Delete or demote middleware.ts to avoid the "both detected" build error.
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
