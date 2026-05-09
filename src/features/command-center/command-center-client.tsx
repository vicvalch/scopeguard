"use client";

import useSWR from "swr";

type AnyRecord = Record<string, unknown>;
const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Failed ${url}`);
  return response.json();
};

import { CoordinationQueueCard, InterventionCard, OperationalHealthCard, RecoveryWorkflowCard, RiskCard, StakeholderPressureCard } from "@/features/command-center/widgets";

export function CommandCenterClient() {
  const swrOptions = { refreshInterval: 20000, revalidateOnFocus: true, dedupingInterval: 3000 };
  const risk = useSWR("/api/intelligence/execution-risk", fetcher, swrOptions);
  const stakeholders = useSWR("/api/intelligence/stakeholders", fetcher, swrOptions);
  const interventions = useSWR("/api/intelligence/interventions", fetcher, swrOptions);
  const coordination = useSWR("/api/intelligence/coordination", fetcher, swrOptions);

  const loading = [risk, stakeholders, interventions, coordination].some((r) => r.isLoading);
  const lastSync = [risk.data?.generatedAt, stakeholders.data?.generatedAt, interventions.data?.generatedAt, coordination.data?.generatedAt].filter(Boolean).sort().at(-1);

  const refreshAll = async () => {
    await Promise.all([risk.mutate(), stakeholders.mutate(), interventions.mutate(), coordination.mutate()]);
  };

  const actions = (coordination.data?.coordination?.operational_priority_queue?.actions ?? coordination.data?.operational_priority_queue?.actions ?? []) as AnyRecord[];
  const commentary = [
    ...(risk.data?.commentary ?? []),
    ...(stakeholders.data?.commentary ?? []),
    ...(interventions.data?.commentary ?? []),
    ...(coordination.data?.coordination?.commentary ?? coordination.data?.commentary ?? []),
  ] as string[];

  return (
    <div className="space-y-5 pb-8">
      <header className="rounded-3xl border border-white/15 bg-slate-900/90 p-6 shadow-2xl shadow-black/50">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">PMFreak Command Center</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Operational Command Dashboard</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">Live execution telemetry for escalations, drift, delivery stability, and stakeholder pressure sequencing.</p>
          </div>
          <button onClick={refreshAll} className="rounded-xl border border-cyan-300/50 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-400/10">Manual Refresh</button>
        </div>
        <p className="mt-4 text-xs text-slate-400">{loading ? "Syncing intelligence..." : `Last sync: ${lastSync ? new Date(lastSync as string).toLocaleString() : "Awaiting first sync"}`}</p>
      </header>

      <RiskCard title="Executive Risk Banner" level={risk.data?.overallRisk as string}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Execution stability", risk.data?.executionStability],
            ["Escalation probability", interventions.data?.intervention?.escalationProbability ?? interventions.data?.escalationProbability],
            ["Coordination urgency", coordination.data?.coordination?.machineOutput?.coordination_urgency ?? coordination.data?.machineOutput?.coordination_urgency],
            ["Stakeholder volatility", stakeholders.data?.communicationStability],
            ["Delivery confidence", risk.data?.deliveryConfidence],
            ["Intervention severity", interventions.data?.intervention?.interventionUrgency ?? interventions.data?.interventionUrgency],
          ].map(([k, v]) => <div key={k as string} className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-xs text-slate-400">{k as string}</p><p className="mt-1 text-lg font-semibold text-white">{String(v ?? "unknown")}</p></div>)}
        </div>
      </RiskCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <CoordinationQueueCard title="Priority Action Queue" level={coordination.data?.coordination_conflict_risk?.level as string}>
          <div className="space-y-3">{actions.slice(0, 5).map((action, idx) => <div key={String(action.actionId ?? idx)} className="rounded-xl border border-white/10 bg-black/25 p-3 text-sm"><p className="font-semibold text-white">#{idx + 1} {String(action.type ?? "action")}</p><p className="text-slate-300">Owner: {String(action.targetStakeholder ?? "unknown")} · Urgency: {String(action.urgency ?? "n/a")} · Timing: {String((action.executionWindow as AnyRecord)?.label ?? "n/a")}</p><p className="mt-1 text-slate-400">Dependency chain: {((action.dependencyChain as AnyRecord[] | undefined) ?? []).map((d) => String(d.reason)).join("; ") || "No blockers"}</p></div>)}</div>
        </CoordinationQueueCard>

        <StakeholderPressureCard title="Stakeholder Pressure Map" level={stakeholders.data?.politicalRisk as string}>
          <div className="space-y-2 text-sm text-slate-200">
            <p>Political risk: <span className="font-semibold">{stakeholders.data?.politicalRisk}</span></p>
            <p>Executive pressure: <span className="font-semibold">{stakeholders.data?.executivePressure}</span></p>
            <p>Escalation trajectory: <span className="font-semibold">{stakeholders.data?.escalationTrajectory}</span></p>
            <p>Communication volatility: <span className="font-semibold">{stakeholders.data?.communicationStability}</span></p>
            <p>Unstable relationships: <span className="font-semibold">{(stakeholders.data?.profiles ?? []).filter((p: AnyRecord) => p.alignmentStatus !== "aligned").length}</span></p>
          </div>
        </StakeholderPressureCard>

        <OperationalHealthCard title="Operational Drift Detection" level={interventions.data?.intervention?.operationalDriftSignal?.driftSeverity as string}>
          <ul className="space-y-2 text-sm text-slate-200">
            <li>Blocker accumulation: {String(interventions.data?.intervention?.operationalDriftSignal?.blockerAccumulation ?? "n/a")}</li>
            <li>Execution silence: {String(interventions.data?.intervention?.operationalDriftSignal?.executionSilence ?? "n/a")}</li>
            <li>Unstable cadence: {String(interventions.data?.intervention?.operationalDriftSignal?.unstableCadence ?? "n/a")}</li>
            <li>Overloaded PMs: {String(interventions.data?.intervention?.operationalDriftSignal?.pmOverloadSignal ?? "n/a")}</li>
            <li>Unresolved escalation chains: {String(interventions.data?.intervention?.operationalDriftSignal?.repeatedEscalationWithoutResolution ?? "n/a")}</li>
            <li>Coordination deadlocks: {String(interventions.data?.intervention?.executionDeadlock ?? "n/a")}</li>
          </ul>
        </OperationalHealthCard>

        <RecoveryWorkflowCard title="Recovery Workflow Panel" level={interventions.data?.interventionUrgency as string}>
          <div className="space-y-2 text-sm text-slate-200">
            <p>Stabilization order:</p>
            <ol className="list-decimal pl-5">{(coordination.data?.execution_recovery_path?.sequence ?? coordination.data?.coordination?.execution_recovery_path?.sequence ?? []).map((item: string) => <li key={item}>{item}</li>)}</ol>
            <p>Escalation recommendations: {String(interventions.data?.escalationTarget ?? interventions.data?.intervention?.escalationTarget ?? "none")}</p>
          </div>
        </RecoveryWorkflowCard>
      </div>

      <InterventionCard title="PMFreak Commentary Stream" level={risk.data?.activeEscalationRisk as string}>
        <div className="space-y-2">{commentary.slice(0, 10).map((line, i) => <p key={`${line}-${i}`} className="rounded-lg border border-white/10 bg-black/20 p-2 text-sm text-slate-200">{line}</p>)}</div>
      </InterventionCard>

      {/* Future architecture: replace polling with websocket intelligence streams and org-wide multiplexing. */}
      {/* Future architecture: add AI execution agents capable of policy-safe intervention sequencing. */}
      {/* Future architecture: multi-project orchestration and autonomous PM agents share deterministic queues. */}
    </div>
  );
}
