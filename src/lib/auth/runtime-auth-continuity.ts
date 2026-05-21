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
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  if (!session) {
    return { ok: false, userId: null, expired: true, issues: ["missing_session"] };
  }
  const expired = Boolean(session.expires_at && session.expires_at * 1000 <= Date.now());
  const report = { ok: !expired, userId: session.user.id, expired, issues: expired ? ["expired_session"] : [] };
  if (!report.ok) logContinuityIssue("auth", { code: "expired_session", severity: "warn", message: "Session expired" }, { userId: report.userId });
  return report;
}
