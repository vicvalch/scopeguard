import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { hasSupabaseEnv, getSupabaseEnv } from "@/lib/supabase/env";

// Safe diagnostic endpoint — never emits token values.
// Use to distinguish "no auth cookie" from "cookie present but Supabase rejects it".
export async function GET(request: NextRequest) {
  const host = request.headers.get("host") ?? "(unknown)";

  const allCookieNames = request.cookies.getAll().map((c) => c.name);
  const authCookieNames = allCookieNames.filter(
    (n) => n.startsWith("sb-") || n.includes("supabase") || n.includes("auth")
  );
  const authCookiePresent = authCookieNames.length > 0;

  const supabaseUrlHostname = hasSupabaseEnv
    ? (() => {
        try {
          return new URL(getSupabaseEnv().url).hostname;
        } catch {
          return "(invalid url)";
        }
      })()
    : "(env missing)";

  let getUserResult: "user_found" | "null" | "env_missing" | "error" = "env_missing";
  let userId: string | null = null;

  if (hasSupabaseEnv) {
    const { url, anonKey } = getSupabaseEnv();
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {
          // read-only probe — no cookie mutation needed
        },
      },
    });

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      getUserResult = "error";
    } else if (user) {
      getUserResult = "user_found";
      userId = user.id;
    } else {
      getUserResult = "null";
    }
  }

  const diagnosis =
    !authCookiePresent
      ? "NO_AUTH_COOKIE — session was not sent to this deployment. Likely a domain/cookie mismatch."
      : getUserResult === "null" || getUserResult === "error"
      ? "COOKIE_PRESENT_BUT_REJECTED — Supabase rejected the token. Check that NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY match the project that issued the session cookie."
      : getUserResult === "env_missing"
      ? "SUPABASE_ENV_MISSING — NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not set in this deployment."
      : "AUTH_OK — getUser() resolved a user.";

  return NextResponse.json({
    host,
    authCookiePresent,
    authCookieNames,
    allCookieCount: allCookieNames.length,
    supabaseUrlHostname,
    getUserResult,
    userId,
    diagnosis,
  });
}
