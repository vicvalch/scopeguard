"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ProjectOption = { id: string; projectName: string; uploadDate: string };
type CopilotCard = { type: "Risks" | "Next Actions" | "Draft Email" | "RACI" | "Checklist"; title: string; items: string[] };
type CopilotResponse = { answer: string; cards: CopilotCard[]; plan: "free" | "pro" | "enterprise"; aiPowered: boolean };
type ChatMessage = { role: "user" | "assistant"; text: string; response?: CopilotResponse };
type AmbientMemory = { blockers: string[]; recentDecisions: string[]; stakeholderPressure: string[]; criticalRisks: string[]; concerns: string[] };
type ExecutionRiskSnapshot = {
  deliveryConfidence: "low" | "medium" | "high" | "critical";
  stakeholderPressure: "low" | "medium" | "high" | "critical";
  executionStability: "stable" | "watching" | "degrading";
  activeEscalationRisk: "none" | "watch" | "elevated" | "immediate";
  commentary: string[];
};

type InterventionSnapshot = {
  interventionUrgency: "none" | "watch" | "elevated" | "critical";
  escalationProbability: number;
  organizationalDrift: number;
  deliveryBreakdownRisk: number;
  recommendedInterventionType: "delivery_recovery" | "stakeholder_alignment" | "execution_unblock" | "capacity_protection" | "escalation_governance";
  escalationTarget: "none" | "project_lead" | "delivery_manager" | "sponsor" | "executive_steering_committee" | "portfolio_office";
  commentary: string[];
};

type StakeholderRelationshipSnapshot = {
  stakeholderAlignment: "aligned" | "mixed" | "fragmented";
  politicalRisk: "low" | "moderate" | "high" | "critical";
  executivePressure: "stable" | "increasing" | "critical";
  communicationStability: "stable" | "watching" | "volatile";
  escalationTrajectory: "none" | "reactive" | "patterned" | "accelerating";
  executiveAlignment: "aligned" | "mixed" | "fragmented";
  commentary: string[];
};
type CoordinationSnapshot = {
  operational_priority_queue: { actions: Array<{ actionId: string; priority: "critical" | "high" | "medium" | "low"; urgency: number; type: string; targetStakeholder: string; recommendedExecutionOrder: number; commentary: string }> };
  escalation_sequence: { sequence: string[]; deadlockRisk: "none" | "watch" | "high" };
  coordination_conflict_risk: { level: "none" | "watch" | "high"; conflicts: string[] };
  execution_recovery_path: { ready: boolean; commentary: string[] };
  dependency_deadlock_risk: { level: "none" | "watch" | "high"; deadlocks: string[] };
  stakeholder_alignment_sequence: { commentary: string[] };
  escalation_overload_risk: { level: "none" | "watch" | "high"; commentary: string };
  commentary: string[];
};

const QUICK_NUDGES = [
  "What changed in stakeholder sentiment this week?",
  "Summarize blockers before tomorrow's client sync.",
  "Draft a calm response to deadline pressure.",
];

export default function CopilotPage() {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [methodology, setMethodology] = useState<"PMI" | "Agile" | "Hybrid" | "General PMO">("Hybrid");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [ambientMemory, setAmbientMemory] = useState<AmbientMemory>({ blockers: [], recentDecisions: [], stakeholderPressure: [], criticalRisks: [], concerns: [] });
  const [executionRisk, setExecutionRisk] = useState<ExecutionRiskSnapshot | null>(null);
  const [stakeholderIntel, setStakeholderIntel] = useState<StakeholderRelationshipSnapshot | null>(null);
  const [intervention, setIntervention] = useState<InterventionSnapshot | null>(null);
  const [coordination, setCoordination] = useState<CoordinationSnapshot | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    void fetch("/api/copilot/context")
      .then((r) => r.json())
      .then((d: { projects?: ProjectOption[] }) => setProjects(d.projects ?? []))
      .catch(() => setProjects([]));
  }, []);

  const selectedProject = useMemo(() => projects.find((p) => p.id === selectedProjectId), [projects, selectedProjectId]);

  useEffect(() => {
    const query = selectedProjectId ? `?projectId=${encodeURIComponent(selectedProjectId)}` : "";
    void fetch(`/api/copilot/memory${query}`)
      .then((r) => r.json())
      .then((d: AmbientMemory) => setAmbientMemory(d))
      .catch(() => setAmbientMemory({ blockers: [], recentDecisions: [], stakeholderPressure: [], criticalRisks: [], concerns: [] }));
  }, [selectedProjectId]);

  useEffect(() => {
    const query = selectedProjectId ? `?projectId=${encodeURIComponent(selectedProjectId)}` : "";
    void fetch(`/api/intelligence/coordination${query}`)
      .then((r) => r.json())
      .then((d: { coordination: CoordinationSnapshot }) => setCoordination(d.coordination))
      .catch(() => setCoordination(null));
  }, [selectedProjectId]);

  useEffect(() => {
    const query = selectedProjectId ? `?projectId=${encodeURIComponent(selectedProjectId)}` : "";
    void fetch(`/api/intelligence/interventions${query}`)
      .then((r) => r.json())
      .then((d: { intervention: InterventionSnapshot }) => setIntervention(d.intervention))
      .catch(() => setIntervention(null));
  }, [selectedProjectId]);

  useEffect(() => {
    const query = selectedProjectId ? `?projectId=${encodeURIComponent(selectedProjectId)}` : "";
    void fetch(`/api/intelligence/execution-risk${query}`)
      .then((r) => r.json())
      .then((d: ExecutionRiskSnapshot) => setExecutionRisk(d))
      .catch(() => setExecutionRisk(null));
  }, [selectedProjectId]);

  useEffect(() => {
    const query = selectedProjectId ? `?projectId=${encodeURIComponent(selectedProjectId)}` : "";
    void fetch(`/api/intelligence/stakeholders${query}`)
      .then((r) => r.json())
      .then((d: StakeholderRelationshipSnapshot) => setStakeholderIntel(d))
      .catch(() => setStakeholderIntel(null));
  }, [selectedProjectId]);

  const send = async (preset?: string) => {
    const message = (preset ?? input).trim();
    if (!message || loading) return;

    setError(null);
    setMessages((p) => [...p, { role: "user", text: message }]);
    setInput("");
    setLoading(true);
    try {
      const response = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          projectId: selectedProject?.id,
          projectName: selectedProject?.projectName,
          methodology,
        }),
      });
      const payload = (await response.json()) as CopilotResponse & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to get PMFreak Copilot response.");
      setMessages((p) => [...p, { role: "assistant", text: payload.answer, response: payload }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to get PMFreak Copilot response.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const names = Array.from(files).map((file) => file.name);
    setUploadedFiles((prev) => [...names, ...prev].slice(0, 6));

    for (const file of Array.from(files)) {
      const body = new FormData();
      body.append("file", file);
      if (selectedProject?.id) body.append("projectId", selectedProject.id);
      try {
        const response = await fetch("/api/upload", { method: "POST", body });
        if (!response.ok) throw new Error("Upload failed");
      } catch {
        setError(`Could not upload ${file.name}. Please try again.`);
      }
    }
  };

  return (
    <div className="min-h-[80vh]">
      <main className="mx-auto grid w-full gap-4 xl:grid-cols-[1fr_280px]">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-4 md:p-6">
          <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">PMFreak Copilot</p>
              <h1 className="mt-1 text-2xl font-semibold">Chat is your command center</h1>
              <p className="mt-1 text-sm text-slate-300">Talk naturally. PMFreak keeps project memory, timeline pressure, and stakeholder context in the background.</p>
            </div>
            <div className="flex gap-2">
              <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)} className="rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-xs">
                <option value="">All projects</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.projectName}</option>)}
              </select>
              <select value={methodology} onChange={(e) => setMethodology(e.target.value as never)} className="rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-xs">
                <option>Hybrid</option><option>PMI</option><option>Agile</option><option>General PMO</option>
              </select>
            </div>
          </header>

          <div className="mb-3 flex flex-wrap gap-2">
            {QUICK_NUDGES.map((prompt) => <button key={prompt} onClick={() => void send(prompt)} className="rounded-full border border-white/20 px-3 py-1 text-xs text-slate-200 hover:border-cyan-300/40 hover:bg-cyan-300/10">{prompt}</button>)}
          </div>

          <div
            onDrop={(e) => { e.preventDefault(); setDragActive(false); void handleUpload(e.dataTransfer.files); }}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            className={`min-h-[520px] rounded-2xl border p-4 transition ${dragActive ? "border-cyan-300/50 bg-cyan-400/5" : "border-white/10 bg-black/20"}`}
          >
            <div className="space-y-3">
              {messages.length === 0 ? <p className="text-sm text-slate-300">Start with a natural update, like “The client is pressuring us again.”</p> : null}
              {messages.map((msg, i) => (
                <article key={i} className={`max-w-3xl rounded-2xl p-3 text-sm ${msg.role === "user" ? "ml-auto bg-cyan-500/20" : "bg-slate-800/70"}`}>
                  <p>{msg.text}</p>
                </article>
              ))}
              {loading ? <p className="text-sm text-slate-300">Thinking…</p> : null}
              {error ? <p className="text-sm text-rose-200">{error}</p> : null}
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => void handleUpload(e.target.files)} />
            <div className="flex gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Message PMFreak…" className="flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm" />
              <button onClick={() => void send()} disabled={loading} className="rounded-xl border border-cyan-300/50 px-4 py-2 text-sm font-semibold">Send</button>
            </div>
            <button onClick={() => fileInputRef.current?.click()} className="text-xs text-cyan-200">+ Drop or attach project files to enrich context</button>
          </div>
        </section>

        <aside className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-200">Ambient context</h2>
          <article className="rounded-2xl border border-amber-300/20 bg-amber-950/20 p-3 text-xs text-amber-100">
            <p className="text-amber-200">PMFreak executive warning</p>
            <p className="mt-1">{executionRisk?.commentary[0] ?? "Operational signal model is warming up. Keep project activity flowing for stronger intelligence."}</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-200">
            <p className="text-cyan-200">Delivery confidence</p>
            <p className="mt-1 uppercase text-slate-300">{executionRisk?.deliveryConfidence ?? "medium"}</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-200">
            <p className="text-cyan-200">Execution stability</p>
            <p className="mt-1 uppercase text-slate-300">{executionRisk?.executionStability ?? "watching"}</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-200">
            <p className="text-cyan-200">Stakeholder pressure</p>
            <p className="mt-1 uppercase text-slate-300">{executionRisk?.stakeholderPressure ?? "low"}</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-200">
            <p className="text-cyan-200">Active escalation risk</p>
            <p className="mt-1 uppercase text-slate-300">{executionRisk?.activeEscalationRisk ?? "watch"}</p>
          </article>
          <article className="rounded-2xl border border-fuchsia-300/20 bg-fuchsia-950/20 p-3 text-xs text-fuchsia-100">
            <p className="text-fuchsia-200">Intervention urgency</p>
            <p className="mt-1 uppercase text-fuchsia-100">{intervention?.interventionUrgency ?? "watch"}</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-200">
            <p className="text-cyan-200">Escalation probability</p>
            <p className="mt-1 text-slate-300">{intervention?.escalationProbability ?? 0}%</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-200">
            <p className="text-cyan-200">Operational drift</p>
            <p className="mt-1 text-slate-300">{intervention?.organizationalDrift ?? 0}%</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-200">
            <p className="text-cyan-200">Delivery instability</p>
            <p className="mt-1 text-slate-300">{intervention?.deliveryBreakdownRisk ?? 0}%</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-200">
            <p className="text-cyan-200">Recommended next action</p>
            <p className="mt-1 uppercase text-slate-300">{intervention?.recommendedInterventionType ?? "capacity_protection"}</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-200">
            <p className="text-cyan-200">Escalation target recommendation</p>
            <p className="mt-1 uppercase text-slate-300">{intervention?.escalationTarget ?? "none"}</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-200">
            <p className="text-cyan-200">Political risk</p>
            <p className="mt-1 uppercase text-slate-300">{stakeholderIntel?.politicalRisk ?? "moderate"}</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-200">
            <p className="text-cyan-200">Communication stability</p>
            <p className="mt-1 uppercase text-slate-300">{stakeholderIntel?.communicationStability ?? "watching"}</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-200">
            <p className="text-cyan-200">Escalation trajectory</p>
            <p className="mt-1 uppercase text-slate-300">{stakeholderIntel?.escalationTrajectory ?? "reactive"}</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-200">
            <p className="text-cyan-200">Executive alignment</p>
            <p className="mt-1 uppercase text-slate-300">{stakeholderIntel?.executiveAlignment ?? "mixed"}</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-200"><p className="text-cyan-200">Active blockers</p><ul className="mt-1 list-disc pl-4 text-slate-300">{(ambientMemory.blockers.length ? ambientMemory.blockers : ["No blockers detected yet."]).map((item) => <li key={item}>{item}</li>)}</ul></article>
          <article className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-200"><p className="text-cyan-200">Recent decisions</p><ul className="mt-1 list-disc pl-4 text-slate-300">{(ambientMemory.recentDecisions.length ? ambientMemory.recentDecisions : ["No decisions captured yet."]).map((item) => <li key={item}>{item}</li>)}</ul></article>
          <article className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-200"><p className="text-cyan-200">Stakeholder pressure</p><ul className="mt-1 list-disc pl-4 text-slate-300">{(ambientMemory.stakeholderPressure.length ? ambientMemory.stakeholderPressure : ["No pressure patterns detected yet."]).map((item) => <li key={item}>{item}</li>)}</ul></article>
          <article className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-200"><p className="text-cyan-200">Critical risks</p><ul className="mt-1 list-disc pl-4 text-slate-300">{(ambientMemory.criticalRisks.length ? ambientMemory.criticalRisks : ["No critical risks detected yet."]).map((item) => <li key={item}>{item}</li>)}</ul></article>
          <article className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-200"><p className="text-cyan-200">AI-detected concerns</p><ul className="mt-1 list-disc pl-4 text-slate-300">{(ambientMemory.concerns.length ? ambientMemory.concerns : ["No concerns detected."]).map((item) => <li key={item}>{item}</li>)}</ul></article>
          <article className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-200"><p className="text-cyan-200">Recent uploads</p><ul className="mt-1 list-disc pl-4 text-slate-300">{uploadedFiles.length ? uploadedFiles.map((name) => <li key={name}>{name}</li>) : <li>No files yet. Drop docs into chat.</li>}</ul></article>
          <article className="rounded-2xl border border-emerald-300/20 bg-emerald-950/20 p-3 text-xs text-emerald-100">
            <p className="text-emerald-200">Coordination urgency</p>
            <p className="mt-1 uppercase">{coordination?.operational_priority_queue.actions[0]?.priority ?? "medium"}</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-200">
            <p className="text-cyan-200">Priority action queue</p>
            <ul className="mt-1 list-disc pl-4 text-slate-300">
              {(coordination?.operational_priority_queue.actions.slice(0, 4) ?? []).map((action) => (
                <li key={action.actionId}>#{action.recommendedExecutionOrder} {action.type} ({action.targetStakeholder}) · {action.urgency}%</li>
              ))}
            </ul>
          </article>
          <article className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-200">
            <p className="text-cyan-200">Escalation sequencing</p>
            <p className="mt-1 text-slate-300">{coordination?.escalation_sequence.sequence.join(" → ") || "No active escalation sequence."}</p>
          </article>
          <article className="rounded-2xl border border-amber-300/20 bg-amber-950/20 p-3 text-xs text-amber-100">
            <p className="text-amber-200">Dependency collision warnings</p>
            <ul className="mt-1 list-disc pl-4">{(coordination?.dependency_deadlock_risk.deadlocks.length ? coordination?.dependency_deadlock_risk.deadlocks : ["No dependency deadlocks detected."]).map((item) => <li key={item}>{item}</li>)}</ul>
          </article>
          <article className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-200">
            <p className="text-cyan-200">Recovery workflow</p>
            <p className="mt-1 text-slate-300">{coordination?.execution_recovery_path.commentary[0] ?? "Recovery workflow warming up."}</p>
          </article>
          <article className="rounded-2xl border border-rose-300/20 bg-rose-950/20 p-3 text-xs text-rose-100">
            <p className="text-rose-200">Coordination bottlenecks</p>
            <ul className="mt-1 list-disc pl-4">{(coordination?.coordination_conflict_risk.conflicts.length ? coordination?.coordination_conflict_risk.conflicts : ["No active coordination bottlenecks."]).map((item) => <li key={item}>{item}</li>)}</ul>
          </article>
          <article className="rounded-2xl border border-fuchsia-300/20 bg-fuchsia-950/20 p-3 text-xs text-fuchsia-100">
            <p className="text-fuchsia-200">Executive coordination guidance</p>
            <p className="mt-1">{coordination?.commentary[1] ?? "Executive coordination guidance unavailable."}</p>
          </article>
        </aside>
      </main>
    </div>
  );
}
