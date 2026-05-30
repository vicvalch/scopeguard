import { requireAuthUser } from "@/lib/auth";
import { assertRuntimeAuthContinuity } from "@/lib/auth/runtime-auth-continuity";
import { resolveCanonicalWorkspace } from "@/lib/workspaces/canonical-workspace-resolver";
import { OperationalShell } from "@/components/pmfreak/operational-shell";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { isFounderOrInternalUser } from "@/lib/auth";
import { ensureUserWorkspace } from "@/lib/workspaces";
import { resolvePostAuthDestination } from "@/lib/auth/resolve-post-auth-destination";
import { isSafeContinuationRoute } from "@/lib/auth/validate-continuation-route";
import { headers } from "next/headers";
import { loadPmoTenant } from "@/lib/pmo/load-pmo-tenant";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const continuity = await assertRuntimeAuthContinuity();
  if (!continuity.ok) {
    const headersList = await headers();
    const currentPath = headersList.get("x-pathname") ?? "/workspace";
    const nextParam = isSafeContinuationRoute(currentPath) ? currentPath : "/workspace";
    const decision = resolvePostAuthDestination({ isAuthenticated: false, onboardingCompleted: false });
    console.log("[protected-layout] continuity check failed, redirecting to login. path:", currentPath, "issues:", continuity.issues, "networkError:", continuity.networkError);
    redirect(`${decision.destination}?next=${encodeURIComponent(nextParam)}`);
  }

  const user = await requireAuthUser();
  let resolvedWorkspace = await resolveCanonicalWorkspace(user.id);
  console.log("[protected-layout] workspace resolution status:", resolvedWorkspace.status, "workspaceId:", resolvedWorkspace.workspaceId ?? "(none)");

  if (!resolvedWorkspace.workspaceId) {
    // Workspace missing — bootstrap it. This is normal for brand-new users.
    const ensured = await ensureUserWorkspace(user.id);
    resolvedWorkspace = { workspaceId: ensured.workspaceId, role: ensured.role, status: "resolved", recovered: true, issues: [] };
    console.log("[protected-layout] workspace bootstrapped:", ensured.workspaceId);
  }

  if (!isFounderOrInternalUser(user)) {
    const supabase = createSupabaseServiceRoleClient({ routeId: "(protected)/layout", operation: "service_role_query", reason: "existing_privileged_flow", systemActor: "system" });

    // Only run the trial gate when we have a real workspace. Brand-new users
    // whose workspace was just bootstrapped above will have no trial yet; that
    // is a setup state, not a revoked/expired state — don't block them here.
    if (resolvedWorkspace.workspaceId && !resolvedWorkspace.recovered) {
      const { data: memberships } = await supabase.from("workspace_memberships").select("workspace_id").eq("user_id", user.id).limit(20);
      const workspaceIds = (memberships ?? []).map((m) => m.workspace_id);
      const { data: activeTrial } = await supabase.from("trial_licenses").select("id, invite_id, workspace_id, trial_status, trial_end_at").in("workspace_id", workspaceIds.length ? workspaceIds : ["00000000-0000-0000-0000-000000000000"]).order("created_at", { ascending: false }).limit(1).maybeSingle();

      console.log("[protected-layout] trial check: activeTrial=", activeTrial?.id ?? "(none)", "status=", activeTrial?.trial_status ?? "n/a");

      if (activeTrial?.id) {
        await supabase.rpc("execute_sql", { query: `update trial_licenses set trial_status='expired' where id='${activeTrial.id}' and trial_status='active' and trial_end_at < now();` });
      }
      const { data: refreshedTrial } = activeTrial?.id
        ? await supabase.from("trial_licenses").select("id, invite_id, workspace_id, trial_status").eq("id", activeTrial.id).maybeSingle()
        : { data: null };
      const inactive = !refreshedTrial || refreshedTrial.trial_status === "revoked" || refreshedTrial.trial_status === "expired";
      if (inactive) {
        console.log("[protected-layout] trial inactive — redirecting to /trial-inactive. refreshedTrial:", refreshedTrial?.trial_status ?? "(none)");
        if (activeTrial?.trial_status === "active" && refreshedTrial?.trial_status === "expired") {
          await supabase.from("early_access_events").insert({ invite_id: refreshedTrial.invite_id, trial_license_id: refreshedTrial.id, workspace_id: refreshedTrial.workspace_id, event_type: "trial_expired_enforced", event_payload: { userId: user.id } });
        }
        await supabase.from("early_access_events").insert({ invite_id: refreshedTrial?.invite_id ?? null, trial_license_id: refreshedTrial?.id ?? null, workspace_id: refreshedTrial?.workspace_id ?? null, event_type: "access_blocked_trial_inactive", event_payload: { userId: user.id } });
        redirect("/trial-inactive");
      }
    } else {
      console.log("[protected-layout] trial check skipped: workspace is newly bootstrapped or missing");
    }
  }
  // Accept schema v2 PMO tenant as proof of onboarding completion even if
  // metadata propagation is delayed (e.g. admin.updateUserById race).
  let effectivelyOnboarded = user.onboardingCompleted;
  if (!effectivelyOnboarded && resolvedWorkspace.workspaceId) {
    const pmoResult = await loadPmoTenant(resolvedWorkspace.workspaceId);
    effectivelyOnboarded = pmoResult.found && pmoResult.schemaVersion === 2;
  }

  if (!effectivelyOnboarded) {
    return <div className="min-h-screen bg-slate-950 text-slate-100"><main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">{children}</main></div>;
  }

  return <OperationalShell user={{ fullName: user.fullName, role: user.role, companyName: user.companyName }}>{children}</OperationalShell>;
}
