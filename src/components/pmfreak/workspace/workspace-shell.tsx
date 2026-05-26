import { WorkspaceConversationShell } from "@/components/pmfreak/workspace/workspace-conversation-shell";

const GOVERNANCE_SECTIONS = ["Portfolio", "PMO", "Projects", "Stakeholders", "Scope", "Timeline", "Cost", "RAID", "Delivery", "Memory"];
const READINESS_CHIPS = ["Conversation Active", "Operational Context Hydrated", "Memory Connected", "Workspace Ready"];

export function WorkspaceShell() {
  return (
    <section className="grid min-h-[calc(100vh-10rem)] gap-6 lg:grid-cols-[240px_1fr_280px]">
      <aside className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <h2 className="text-sm font-semibold text-slate-100">Governance rail</h2>
        <p className="mt-2 text-xs text-slate-400">Operational context scaffold for upcoming governance intelligence layers.</p>
        <ul className="mt-4 space-y-2 text-xs text-slate-300">
          {GOVERNANCE_SECTIONS.map((section) => (
            <li key={section} className="rounded-lg border border-white/10 px-3 py-2">{section}</li>
          ))}
        </ul>
      </aside>

      <main className="space-y-4">
        <div className="rounded-2xl border border-cyan-400/25 bg-slate-900/70 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Command Workspace</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {READINESS_CHIPS.map((chip) => (
              <span key={chip} className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-100">{chip}</span>
            ))}
          </div>
        </div>
        <WorkspaceConversationShell />
      </main>

      <aside className="rounded-2xl border border-white/10 bg-black/20 p-4 text-xs text-slate-300">
        <h2 className="text-sm font-semibold text-slate-100">Operational intelligence</h2>
        <ul className="mt-3 space-y-2">
          <li className="rounded-lg border border-white/10 px-3 py-2">Active workspace: Enterprise PMO</li>
          <li className="rounded-lg border border-white/10 px-3 py-2">Project context: Multi-program recovery watch</li>
          <li className="rounded-lg border border-white/10 px-3 py-2">Recent decisions: 2 pending sponsor asks</li>
          <li className="rounded-lg border border-white/10 px-3 py-2">Memory indicator: cross-domain sync healthy</li>
          <li className="rounded-lg border border-white/10 px-3 py-2">Intervention suggestion: align delivery + stakeholders</li>
        </ul>
      </aside>
    </section>
  );
}
