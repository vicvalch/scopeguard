import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { resolvePostAuthDestination } from "@/lib/auth/resolve-post-auth-destination";
import { isSafeContinuationRoute } from "@/lib/auth/validate-continuation-route";
import { debugAuthDecision } from "@/lib/auth/auth-decision-debug";
import { hasSupabaseEnv, getSupabaseEnv } from "@/lib/supabase/env";

export async function POST(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const requestedRouteFromForm = String(formData.get("next") ?? "").trim();
  const requestedRouteFromQuery = requestUrl.searchParams.get("next")?.trim() ?? "";
  const requestedRoute = requestedRouteFromForm || requestedRouteFromQuery || null;

  if (!email || !password) {
    return NextResponse.redirect(new URL("/login?error=Email+and+password+are+required", request.url));
  }

  if (!hasSupabaseEnv) {
    return NextResponse.redirect(new URL("/login?error=Auth+service+not+configured", request.url));
  }

  // Collect cookies emitted by signInWithPassword so we can attach them to the
  // redirect response. We cannot use createSupabaseServerClient() here because
  // that uses cookies() from next/headers whose .set() calls do NOT propagate
  // to an explicitly returned NextResponse — the browser would never receive
  // the Set-Cookie headers and the session would be silently dropped.
  type PendingCookie = { name: string; value: string; options: Record<string, unknown> };
  const pendingCookies: PendingCookie[] = [];

  const { url, anonKey } = getSupabaseEnv();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          pendingCookies.push({ name, value, options: options ?? {} });
        });
      },
    },
  });

  const { error, data } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const isUnverified = error.message.toLowerCase().includes("email not confirmed");
    const message = isUnverified ? "Please verify your email before logging in." : error.message;
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(message)}`, request.url));
  }

  const safe = requestedRoute ? isSafeContinuationRoute(requestedRoute) : false;
  const decision = resolvePostAuthDestination({
    isAuthenticated: Boolean(data.user),
    onboardingCompleted: data.user?.user_metadata?.onboarding_completed === true,
    requestedRoute,
    isRequestedRouteSafe: safe,
  });

  debugAuthDecision({ requestedRoute, onboardingCompleted: data.user?.user_metadata?.onboarding_completed === true, decision });

  const response = NextResponse.redirect(new URL(decision.destination, request.url));

  // Write auth cookies onto the response so the browser stores the session.
  pendingCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
  });

  console.log("[api/login] sign-in success userId:", data.user?.id, "pendingCookies:", pendingCookies.map((c) => c.name), "redirecting to:", decision.destination);

  return response;
}
