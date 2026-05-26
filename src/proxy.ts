import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { resolvePostAuthDestination } from "@/lib/auth/resolve-post-auth-destination";
import { isSafeContinuationRoute } from "@/lib/auth/validate-continuation-route";

const protectedRoutes = ["/dashboard", "/onboarding", "/getting-started", "/upload", "/portfolio", "/projects", "/workspace", "/command-center", "/copilot"];
const authRoutes = ["/login", "/signup"];
const setupRoutes = ["/workspace/setup", "/getting-started", "/onboarding"];

const startsWithAny = (pathname: string, routes: string[]) => routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const pathname = request.nextUrl.pathname;
  const isProtected = startsWithAny(pathname, protectedRoutes);

  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user) {
    const onboardingCompleted = user.user_metadata?.onboarding_completed === true;
    const requestedRoute = request.nextUrl.searchParams.get("next");
    const isAuthRoute = startsWithAny(pathname, authRoutes);
    const isSetupRoute = startsWithAny(pathname, setupRoutes);
    const decision = resolvePostAuthDestination({
      isAuthenticated: true,
      onboardingCompleted,
      requestedRoute,
      isRequestedRouteSafe: requestedRoute ? isSafeContinuationRoute(requestedRoute) : false,
    });

    if (isAuthRoute) {
      return NextResponse.redirect(new URL(decision.destination, request.url));
    }

    if (!onboardingCompleted && isProtected && !isSetupRoute && pathname !== "/logout") {
      return NextResponse.redirect(new URL("/workspace/setup", request.url));
    }

    if (onboardingCompleted && isSetupRoute) {
      return NextResponse.redirect(new URL("/workspace", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/onboarding/:path*",
    "/getting-started/:path*",
    "/upload/:path*",
    "/portfolio/:path*",
    "/projects/:path*",
    "/workspace/:path*",
    "/command-center/:path*",
    "/copilot/:path*",
    "/logout",
    "/login",
    "/signup",
  ],
};
