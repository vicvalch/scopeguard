import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logContinuityIssue } from "@/lib/auth/auth-continuity-diagnostics";

export type RuntimeAuthContinuityReport = {
  ok: boolean;
  userId: string | null;
  expired: boolean;
  issues: string[];
};

export async function assertRuntimeAuthContinuity(): Promise<RuntimeAuthContinuityReport> {
  const supabase = await createSupabaseServerClient();
  // getUser() validates the JWT against Supabase's server (authoritative).
  // Unlike getSession(), it does not silently pass expired tokens.
  const { data: { user }, error } = await supabase.auth.getUser();

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
