import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolvePostAuthDestination } from "@/lib/auth/resolve-post-auth-destination";
import { isSafeContinuationRoute } from "@/lib/auth/validate-continuation-route";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");

  const supabase = await createSupabaseServerClient();

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

  return NextResponse.redirect(new URL(decision.destination, request.url));
}
