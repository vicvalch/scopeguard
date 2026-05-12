import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function GovernancePage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("governance_approval_requests").select("*").order("created_at", { ascending: false }).limit(50);
  const approvalIds = (data ?? []).map((r) => r.id);
  const { data: grants } = approvalIds.length ? await supabase.from("governance_execution_grants").select("approval_request_id, status, expires_at").in("approval_request_id", approvalIds) : { data: [] as any[] };
  const grantByApproval = new Map((grants ?? []).map((g) => [g.approval_request_id, g]));
  return <main className="p-6"><h1 className="text-2xl font-semibold">Approval Inbox</h1><div className="space-y-4 mt-4">{(data ?? []).map((r) => { const grant = grantByApproval.get(r.id); return <div key={r.id} className="border p-3 rounded"><p><b>{r.action}</b> · {r.risk_level}</p><p>Status: <b>{r.status}</b>{r.status === "approved" && !grant ? " (approved, awaiting execution grant)" : ""}</p><p>Requester: {r.actor_user_id ?? r.actor_agent_id ?? "n/a"}</p><p>Grant: {grant ? `${grant.status} · expires ${grant.expires_at ?? "n/a"}` : "none"}</p><p>Reason: {r.reason}</p><details><summary>Trace</summary><pre className="text-xs overflow-auto">{JSON.stringify(r.trace, null, 2)}</pre></details><div className="mt-2 flex gap-2">{r.status === "pending_approval" ? <><form action={`/api/governance/approvals/${r.id}/approve`} method="post"><button className="px-2 py-1 bg-green-600 text-white rounded" type="submit">Approve</button></form><form action={`/api/governance/approvals/${r.id}/reject`} method="post"><button className="px-2 py-1 bg-red-600 text-white rounded" type="submit">Reject</button></form></> : null}</div></div>; })}</div></main>;
}
