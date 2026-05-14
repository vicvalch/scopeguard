import Link from "next/link";
import { getWorkspaceAuditTimeline } from "@/lib/audit-trail";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAuthUser } from "@/lib/auth";

export default async function AuditPage() {
  const user = await requireAuthUser();
  const supabase = await createSupabaseServerClient();
  const { data: membership } = await supabase.from("workspace_memberships").select("workspace_id, role").eq("user_id", user.id).order("created_at", { ascending: true }).limit(1).maybeSingle<{ workspace_id: string; role: string }>();
  if (!membership) return <div className="rounded-2xl border border-white/10 bg-white/5 p-6">No workspace membership found.</div>;

  const timeline = await getWorkspaceAuditTimeline(membership.workspace_id);

  return <main className="space-y-4">
    <section className="rounded-2xl border border-white/10 p-4">
      <h1 className="text-2xl font-semibold">Trust Audit Timeline</h1>
      <p className="text-sm text-slate-300">Human-readable timeline of capability, policy, approval, and security decisions.</p>
    </section>
    <section className="rounded-2xl border border-white/10 p-4">
      <ul className="space-y-3">
        {timeline.map((item) => <li key={item.id} className="rounded border border-white/10 p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <strong>{item.action_label}</strong>
            <span className={`rounded px-2 py-0.5 text-xs ${item.severity === "high" ? "bg-rose-500/20" : item.severity === "medium" ? "bg-amber-500/20" : "bg-emerald-500/20"}`}>{item.severity}</span>
            <span className="text-slate-400">{new Date(item.timestamp).toLocaleString()}</span>
          </div>
          <p>{item.actor_display} {item.decision ? `${item.decision_label.toLowerCase()}ed` : "recorded"} {item.resource_label}.</p>
          {item.reason ? <p className="text-slate-300">Reason: {item.reason.replaceAll("_", " ")}.</p> : null}
          {item.policy_trace.length ? <ul className="ml-4 list-disc text-slate-300">{item.policy_trace.map((trace) => <li key={trace}>{trace}</li>)}</ul> : null}
          {item.capability_request_id ? <p><Link className="underline" href="/capabilities">Request {item.capability_request_id.slice(0, 8)}…</Link></p> : null}
          {membership.role === "owner" || membership.role === "admin" ? <details className="mt-2"><summary>Technical details</summary><pre className="mt-2 overflow-x-auto rounded bg-black/30 p-2 text-xs">{JSON.stringify(item.technical_details ?? item.metadata_summary, null, 2)}</pre></details> : null}
        </li>)}
      </ul>
    </section>
  </main>;
}
