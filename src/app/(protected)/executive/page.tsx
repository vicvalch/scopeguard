import { ExecutiveDashboard } from "@/components/pmfreak/executive/executive-dashboard";
import { getAuthUser } from "@/lib/auth";
import { buildExecutiveSynthesis } from "@/lib/executive-synthesis";

export default async function ExecutivePage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const user = await getAuthUser();
  if (!user) return null;
  const snapshot = await buildExecutiveSynthesis(user.companyId, null);
  const params = await searchParams;
  const fromActivation = params.from === "getting-started";
  const weakest = snapshot.weakestDomains[0];

  return (
    <main className="space-y-6 pb-8">
      <header className="rounded-2xl border border-slate-700 bg-white p-6">
        <p className="text-xs uppercase tracking-[0.25em] text-slate-400">PMFreak Executive Layer</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Executive Operational Intelligence</h1>
        <p className="mt-2 text-sm text-slate-300">Deterministic cross-domain synthesis for intervention and escalation governance.</p>
      </header>

      {fromActivation ? (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <article className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs text-slate-400">Escalation probability</p><p className="text-2xl font-semibold text-rose-300">{snapshot.escalationRisk.probabilityScore}%</p></article>
          <article className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs text-slate-400">Operational health</p><p className="text-2xl font-semibold text-cyan-200">{snapshot.health.overall}%</p></article>
          <article className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs text-slate-400">Weakest domain</p><p className="text-sm font-semibold text-amber-200">{weakest?.domain.replaceAll("_", " ") ?? "n/a"}</p></article>
          <article className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs text-slate-400">PM overload signal</p><p className="text-sm font-semibold">{snapshot.signals.find((s) => s.signalType === "pm_fatigue")?.score ?? 0}%</p></article>
          <article className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs text-slate-400">Governance gaps</p><p className="text-sm font-semibold">{snapshot.missingInformationWarnings.filter((w) => w.includes("governance") || w.includes("pmo_governance")).length}</p></article>
          <article className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs text-slate-400">Intervention recommendations</p><p className="text-sm font-semibold">{snapshot.interventions.length}</p></article>
        </section>
      ) : null}

      <ExecutiveDashboard snapshot={snapshot} />
    </main>
  );
}
