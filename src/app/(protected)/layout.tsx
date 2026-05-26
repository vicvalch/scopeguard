import { requireAuthUser } from "@/lib/auth";
import { assertRuntimeAuthContinuity } from "@/lib/auth/runtime-auth-continuity";
import { resolveCanonicalWorkspace } from "@/lib/workspaces/canonical-workspace-resolver";
import { OperationalShell } from "@/components/pmfreak/operational-shell";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { isFounderOrInternalUser } from "@/lib/auth";
import { ensureUserWorkspace } from "@/lib/workspaces";
import { resolvePostAuthDestination } from "@/lib/auth/resolve-post-auth-destination";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const continuity = await assertRuntimeAuthContinuity();
  if (!continuity.ok) {
    const decision = resolvePostAuthDestination({ isAuthenticated: false, onboardingCompleted: false });
    redirect(`${decision.destination}?next=${encodeURIComponent("/workspace")}`);
  }

  const user = await requireAuthUser();
  const resolvedWorkspace = await resolveCanonicalWorkspace(user.id);
  if (!resolvedWorkspace.workspaceId) {
    await ensureUserWorkspace(user.id);
  }
  if (!isFounderOrInternalUser(user)) {
    const supabase = createSupabaseServiceRoleClient({ routeId: "(protected)/layout", operation: "service_role_query", reason: "existing_privileged_flow", systemActor: "system" });
    const { data: memberships } = await supabase.from("workspace_memberships").select("workspace_id").eq("user_id", user.id).limit(20);
    const workspaceIds = (memberships ?? []).map((m) => m.workspace_id);
    const { data: activeTrial } = await supabase.from("trial_licenses").select("id, invite_id, workspace_id, trial_status, trial_end_at").in("workspace_id", workspaceIds.length ? workspaceIds : ["00000000-0000-0000-0000-000000000000"]).order("created_at", { ascending: false }).limit(1).maybeSingle();

    if (activeTrial?.id) {
      await supabase.rpc("execute_sql", { query: `update trial_licenses set trial_status='expired' where id='${activeTrial.id}' and trial_status='active' and trial_end_at < now();` });
    }
    const { data: refreshedTrial } = activeTrial?.id
      ? await supabase.from("trial_licenses").select("id, invite_id, workspace_id, trial_status").eq("id", activeTrial.id).maybeSingle()
      : { data: null };
    const inactive = !refreshedTrial || refreshedTrial.trial_status === "revoked" || refreshedTrial.trial_status === "expired";
    if (inactive) {
      if (activeTrial?.trial_status === "active" && refreshedTrial?.trial_status === "expired") {
        await supabase.from("early_access_events").insert({ invite_id: refreshedTrial.invite_id, trial_license_id: refreshedTrial.id, workspace_id: refreshedTrial.workspace_id, event_type: "trial_expired_enforced", event_payload: { userId: user.id } });
      }
      await supabase.from("early_access_events").insert({ invite_id: refreshedTrial?.invite_id ?? null, trial_license_id: refreshedTrial?.id ?? null, workspace_id: refreshedTrial?.workspace_id ?? null, event_type: "access_blocked_trial_inactive", event_payload: { userId: user.id } });
      redirect("/trial-inactive");
    }
  }
  if (!user.onboardingCompleted) {
    return <div className="min-h-screen bg-slate-950 text-slate-100"><main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">{children}</main></div>;
  }

  return <OperationalShell user={{ fullName: user.fullName, role: user.role, companyName: user.companyName }}>{children}</OperationalShell>;
}
