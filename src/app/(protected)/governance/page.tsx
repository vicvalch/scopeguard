import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function GovernancePage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("governance_approval_requests").select("*").order("created_at", { ascending: false }).limit(50);
  const approvalIds = (data ?? []).map((r) => r.id);
  const { data: grants } = approvalIds.length
    ? await supabase.from("governance_execution_grants").select("approval_request_id, status, expires_at").in("approval_request_id", approvalIds)
    : { data: [] as Array<{ approval_request_id: string; status: string; expires_at: string | null }> };
  const { data: delegations } = await supabase.from("governance_delegations").select("*").order("created_at", { ascending: false }).limit(50);
  const grantByApproval = new Map((grants ?? []).map((g) => [g.approval_request_id, g]));

  return (
    <section className="space-y-8 rounded-3xl border border-white/10 bg-slate-900/55 p-6 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.95)] backdrop-blur-xl md:p-8">
      <section>
        <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/90">Governance</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-50">Approval inbox</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">Review high-risk execution requests with clean lineage, clear status, and immediate decision controls.</p>

        <div className="mt-5 space-y-3">
          {(data ?? []).map((r) => {
            const grant = grantByApproval.get(r.id);
            return (
              <article key={r.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-slate-100">{r.action}</p>
                  <span className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] uppercase tracking-wide text-slate-300">{r.risk_level}</span>
                </div>
                <p className="mt-2 text-xs text-slate-400">Requester: {r.actor_user_id ?? r.actor_agent_id ?? "n/a"}</p>
                <p className="mt-1 text-xs text-slate-400">Status: <span className="font-medium text-slate-200">{r.status}</span>{r.status === "approved" && !grant ? " (awaiting execution grant)" : ""}</p>
                <p className="mt-1 text-xs text-slate-400">Grant: {grant ? `${grant.status} · expires ${grant.expires_at ?? "n/a"}` : "none"}</p>
                <p className="mt-2 leading-relaxed">{r.reason}</p>
                <details className="mt-3 rounded-xl border border-white/10 bg-slate-950/60 p-3">
                  <summary className="cursor-pointer text-xs font-medium text-slate-200">Trace</summary>
                  <pre className="mt-2 overflow-auto text-[11px] text-slate-400">{JSON.stringify(r.trace, null, 2)}</pre>
                </details>
                {r.status === "pending_approval" ? (
                  <div className="mt-3 flex gap-2">
                    <form action={`/api/governance/approvals/${r.id}/approve`} method="post">
                      <button className="rounded-lg border border-emerald-400/35 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/25" type="submit">Approve</button>
                    </form>
                    <form action={`/api/governance/approvals/${r.id}/reject`} method="post">
                      <button className="rounded-lg border border-rose-400/35 bg-rose-500/15 px-3 py-1.5 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/25" type="submit">Reject</button>
                    </form>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold tracking-tight text-slate-100">Governance delegations</h2>
        <div className="mt-4 space-y-3">
          {(delegations ?? []).map((d) => (
            <article key={d.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
              <p className="font-semibold text-slate-100">{d.action} · {d.requested_permission}</p>
              <p className="mt-1 text-xs text-slate-400">Delegatee: {d.delegatee_user_id ?? d.delegatee_agent_id ?? "n/a"}</p>
              <p className="mt-1 text-xs text-slate-400">Scope: workspace {d.workspace_id} · project {d.project_id ?? "n/a"} · resource {d.resource_type ?? "n/a"}/{d.resource_id ?? "n/a"}</p>
              <p className="mt-1 text-xs text-slate-400">Uses: {d.uses_count}/{d.max_uses} · Expires: {d.expires_at} · Status: {d.status}</p>
              <details className="mt-3 rounded-xl border border-white/10 bg-slate-950/60 p-3">
                <summary className="cursor-pointer text-xs font-medium text-slate-200">Lineage</summary>
                <pre className="mt-2 overflow-auto text-[11px] text-slate-400">{JSON.stringify({ parentGrantId: d.parent_grant_id, parentDecisionId: d.parent_decision_id, delegatorUserId: d.delegator_user_id, delegatorAgentId: d.delegator_agent_id, delegateeUserId: d.delegatee_user_id, delegateeAgentId: d.delegatee_agent_id, constraints: d.constraints, expiresAt: d.expires_at }, null, 2)}</pre>
              </details>
              <form action="/api/governance/delegations/revoke" method="post" className="mt-3">
                <input type="hidden" name="delegationId" value={d.id} />
                <input type="hidden" name="workspaceId" value={d.workspace_id} />
                <button className="rounded-lg border border-amber-300/35 bg-amber-400/15 px-3 py-1.5 text-xs font-semibold text-amber-100 transition hover:bg-amber-400/25" type="submit">Revoke</button>
              </form>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
