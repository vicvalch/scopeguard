import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logContinuityIssue } from "@/lib/auth/auth-continuity-diagnostics";
import { cookies, headers } from "next/headers";

export type RuntimeAuthContinuityReport = {
  ok: boolean;
  userId: string | null;
  expired: boolean;
  issues: string[];
};

export async function assertRuntimeAuthContinuity(): Promise<RuntimeAuthContinuityReport> {
  const supabase = await createSupabaseServerClient();

  // DEBUG: log auth cookie presence and getUser() result to diagnose production
  // redirect-to-login issues. Remove once root cause is confirmed.
  const cookieStore = await cookies();
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "(unknown)";
  const allCookies = cookieStore.getAll();
  const authCookieNames = allCookies
    .filter((c) => c.name.startsWith("sb-") || c.name.includes("supabase") || c.name.includes("auth"))
    .map((c) => c.name);
  console.log("[auth-continuity] pathname:", pathname);
  console.log("[auth-continuity] auth-related cookies present:", authCookieNames.length > 0 ? authCookieNames : "(none)");

  // getUser() validates the JWT against Supabase's server (authoritative).
  // Unlike getSession(), it does not silently pass expired tokens.
  const { data: { user }, error } = await supabase.auth.getUser();

  console.log("[auth-continuity] getUser result:", user ? `userId=${user.id}` : `null (error: ${error?.message ?? "none"})`);

  if (!user || error) {
    const issue = "missing_session";
    logContinuityIssue(
      "auth",
      { code: issue, severity: "warn", message: error?.message ?? "No authenticated user" },
      {}
    );
    return { ok: false, userId: null, expired: true, issues: [issue] };
  }

  return { ok: true, userId: user.id, expired: false, issues: [] };
}
