import Link from "next/link";

export function WorkspaceShell() {
  return (
    <section className="grid min-h-[calc(100vh-10rem)] gap-6 lg:grid-cols-[260px_1fr]">
      <aside className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <h2 className="text-sm font-semibold text-slate-100">Governance rail</h2>
        <p className="mt-2 text-xs text-slate-400">Policy, approvals, and trust controls will anchor here.</p>
        <ul className="mt-4 space-y-2 text-xs text-slate-300">
          <li className="rounded-lg border border-white/10 px-3 py-2">Authority map (placeholder)</li>
          <li className="rounded-lg border border-white/10 px-3 py-2">Risk watchlist (placeholder)</li>
          <li className="rounded-lg border border-white/10 px-3 py-2">Escalation queue (placeholder)</li>
        </ul>
      </aside>

      <main className="rounded-2xl border border-cyan-400/25 bg-slate-900/70 p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">PMFreak workspace</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-100">Conversational operating center</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">Use this workspace as your canonical operational home. Coordinate context, ask Copilot, and drive execution from one place.</p>
          </div>
          <Link href="/copilot" className="rounded-xl border border-cyan-300/40 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-200 hover:bg-cyan-500/20">
            Open Copilot
          </Link>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/25 p-4">
          <p className="text-sm font-medium text-slate-100">Conversation canvas</p>
          <p className="mt-2 text-sm text-slate-300">Chat threads, intervention summaries, and live decisions will render here as the core workspace surface.</p>
        </div>
      </main>
    </section>
  );
}
