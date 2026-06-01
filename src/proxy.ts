import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { resolvePostAuthDestination } from "@/lib/auth/resolve-post-auth-destination";
import { resolveOnboardingStateFromJwt } from "@/lib/auth/resolve-onboarding-state";
import { getOnboardingRedirect, isOnboardingComplete } from "@/lib/auth/onboarding-route-map";
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
    // Use sync JWT-based state resolver — middleware cannot do async DB calls.
    const jwtOnboardingCompleted = user.user_metadata?.onboarding_completed === true;
    const onboardingState = resolveOnboardingStateFromJwt(jwtOnboardingCompleted);
    const onboardingCompleted = isOnboardingComplete(onboardingState);

    if (isAuthRoute(pathname)) {
      const requestedRoute = request.nextUrl.searchParams.get("next");
      const decision = resolvePostAuthDestination({
        isAuthenticated: true,
        onboardingState,
        requestedRoute,
        isRequestedRouteSafe: requestedRoute ? isSafeContinuationRoute(requestedRoute) : false,
      });

      return NextResponse.redirect(new URL(decision.destination, request.url));
    }

    if (isSetupRoute(pathname) && onboardingCompleted) {
      return NextResponse.redirect(new URL("/workspace", request.url));
    }

    if (requiresOnboardingCompletion(pathname) && !onboardingCompleted && pathname !== "/logout") {
      return NextResponse.redirect(new URL(getOnboardingRedirect(onboardingState), request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
