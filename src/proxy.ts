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
  const pathname = request.nextUrl.pathname;
  const authCookiesPresent = request.cookies.getAll().some(
    (c) => c.name.startsWith("sb-") || c.name.includes("supabase") || c.name.includes("auth")
  );
  console.log("[proxy] pathname:", pathname);
  console.log("[proxy] auth cookies present:", authCookiesPresent);

  const { response, user } = await updateSession(request);

  const responseCookiesSet = response.cookies.getAll().length > 0;
  console.log("[proxy] getUser result:", user ? `userId=${user.id}` : "null (unauthenticated)");
  console.log("[proxy] response cookies set:", responseCookiesSet, responseCookiesSet ? response.cookies.getAll().map((c) => c.name) : []);

  const policy = getRouteAccessPolicy(pathname);

  if (policy === "api") {
    return response;
  }

  if (isInternalDebugRoute(pathname) && process.env.NODE_ENV === "production") {
    return NextResponse.redirect(new URL("/workspace", request.url));
  }

  if (isProtectedPageRoute(pathname) && !user) {
    console.log("[proxy] redirecting to /login — no authenticated user for protected route:", pathname);
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
