import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { resolvePostAuthDestination } from "@/lib/auth/resolve-post-auth-destination";
import { isSafeContinuationRoute } from "@/lib/auth/validate-continuation-route";
import { hasSupabaseEnv, getSupabaseEnv } from "@/lib/supabase/env";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");

  if (!hasSupabaseEnv) {
    return NextResponse.redirect(new URL("/login?error=Auth+service+not+configured", request.url));
  }

  // Same pattern as /api/login: collect cookies from exchangeCodeForSession and
  // apply them to the final redirect response. cookies().set() does not propagate
  // to an explicitly returned NextResponse.
  type PendingCookie = { name: string; value: string; options: Record<string, unknown> };
  const pendingCookies: PendingCookie[] = [];

  const { url: supabaseUrl, anonKey } = getSupabaseEnv();
  const supabase = createServerClient(supabaseUrl, anonKey, {
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

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent("Your verification link is invalid or expired. Please log in again.")}`, request.url));
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const decision = resolvePostAuthDestination({
    isAuthenticated: Boolean(user),
    onboardingCompleted: user?.user_metadata?.onboarding_completed === true,
    requestedRoute: next,
    isRequestedRouteSafe: Boolean(next && isSafeContinuationRoute(next)),
  });

  const response = NextResponse.redirect(new URL(decision.destination, request.url));

  pendingCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
  });

  console.log("[auth/callback] exchangeCodeForSession userId:", user?.id ?? "null", "pendingCookies:", pendingCookies.map((c) => c.name), "redirecting to:", decision.destination);

  return response;
}
