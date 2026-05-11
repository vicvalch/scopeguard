import Link from "next/link";
import { ModuleShell } from "@/components/pmfreak/module-shell";

export default function DashboardPage() {
  return (
    <ModuleShell
      title="Home"
      subtitle="Monitor current operational state, align on workflow, and decide the next intervention move."
      metrics={[
        { label: "Operational State", value: "Live" },
        { label: "Workflow", value: "Unified" },
        { label: "Project Scope", value: "Persistent" },
        { label: "Next Action", value: "Required" },
      ]}
    >
      <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Purpose</p>
        <p className="mt-2 text-sm text-slate-200">PMFreak unifies operational input, memory, synthesis, and intervention into one command workflow.</p>
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        {[
          ["Input Hub", "Feed current reality from delivery, governance, and stakeholder channels.", "/input-hub"],
          ["Executive", "Review executive operational intelligence and intervention priorities.", "/executive"],
          ["Follow-up", "Track ownership and close active intervention commitments.", "/follow-up-dashboard"],
          ["Command Center", "Focus on highest-severity escalation and operational instability.", "/command-center"],
        ].map(([title, text, href]) => (
          <Link key={title} href={href as string} className="rounded-2xl border border-white/10 bg-white/20 p-4 hover:border-cyan-300/40">
            <h3 className="font-semibold">{title}</h3><p className="mt-2 text-sm text-slate-300">{text}</p>
          </Link>
        ))}
      </section>
    </ModuleShell>
  );
}
