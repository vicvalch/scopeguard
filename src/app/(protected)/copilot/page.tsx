"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ProjectOption = { id: string; projectName: string; uploadDate: string };
type CopilotCard = { type: "Risks" | "Next Actions" | "Draft Email" | "RACI" | "Checklist"; title: string; items: string[] };
type IngestionMetadata = {
  status: "skipped" | "ingested";
  reason?: string;
  indicators: string[];
  domainsAffected: string[];
  recordsPersisted: number;
  signalCount: number;
};

type CopilotResponse = {
  answer: string;
  cards: CopilotCard[];
  plan: "free" | "pro" | "enterprise";
  aiPowered: boolean;
  ingestion?: IngestionMetadata;
  contextGapQuestions?: string[];
};
type UploadApiResponse =
  | { ok: true; uploadedFileNames: string[]; uploadedCount: number; ingestion: { extractedSignals: { risks: number; stakeholders: number } } }
  | { ok: false; error: string; code: string };

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  response?: CopilotResponse;
  ingestion?: IngestionMetadata;
  state?: "streaming" | "complete" | "error";
};

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

const MEMORY_DOMAINS = ["stakeholder_intelligence","delivery_intelligence","risk_intelligence","pmo_governance","team_health","executive_context","operational_memory"] as const;

const FIRST_SESSION_PROMPTS = {
  operational: [
    "Summarize delivery health in plain executive language.",
    "What execution pattern is most likely to fail this week?",
  ],
  escalation: [
    "What should I escalate in the next 24 hours, and who owns the escalation?",
    "Draft a calm escalation note for the sponsor with decision asks.",
  ],
  stakeholder: [
    "Who is most likely to block progress and why?",
    "How should I brief stakeholders with mixed alignment?",
  ],
  delivery: [
    "Give me a recovery path for the top slipping milestone.",
    "Convert today's risks into an accountable 3-step action plan.",
  ],
};

const QUICK_NUDGES = [
  "What is the single most important risk right now?",
  "Give me the top 3 actions for the next 24 hours.",
  "Draft an executive-ready status update in 6 bullets.",
  "Which issue should I escalate today, and to whom?",
  "What are stakeholders likely to challenge in tomorrow's review?",
];

export default function CopilotPage() {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [methodology, setMethodology] = useState<"PMI" | "Agile" | "Hybrid" | "General PMO">("Hybrid");
  const [input, setInput] = useState("");
  const [memoryDomain, setMemoryDomain] = useState<(typeof MEMORY_DOMAINS)[number]>("operational_memory");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [thinkingState, setThinkingState] = useState<"idle" | "triaging" | "reasoning" | "validating">("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const [activeFollowUps, setActiveFollowUps] = useState<string[]>(QUICK_NUDGES);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [ambientMemory, setAmbientMemory] = useState<AmbientMemory>({ blockers: [], recentDecisions: [], stakeholderPressure: [], criticalRisks: [], concerns: [] });
  const [executionRisk, setExecutionRisk] = useState<ExecutionRiskSnapshot | null>(null);
  const [stakeholderIntel, setStakeholderIntel] = useState<StakeholderRelationshipSnapshot | null>(null);
  const [intervention, setIntervention] = useState<InterventionSnapshot | null>(null);
  const [coordination, setCoordination] = useState<CoordinationSnapshot | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messageIdRef = useRef(0);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

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

  const streamAssistant = async (messageId: string, text: string) => {
    const chunks = text.split(" ");
    for (let i = 0; i < chunks.length; i += 1) {
      const partial = `${chunks.slice(0, i + 1).join(" ")} `;
      setMessages((prev) => prev.map((msg) => (msg.id === messageId ? { ...msg, text: partial, state: "streaming" } : msg)));
      await new Promise((resolve) => setTimeout(resolve, Math.max(16, Math.min(80, 640 / chunks.length))));
    }
  };

  const send = async (preset?: string) => {
    const message = (preset ?? input).trim();
    if (!message || loading) return;

    messageIdRef.current += 1;
    const userMessageId = `user-${messageIdRef.current}`;
    messageIdRef.current += 1;
    const assistantMessageId = `assistant-${messageIdRef.current}`;
    setError(null);
    setLastFailedMessage(null);
    setMessages((p) => [
      ...p,
      { id: userMessageId, role: "user", text: message, state: "complete" },
      { id: assistantMessageId, role: "assistant", text: "", state: "streaming" },
    ]);
    setInput("");
    setLoading(true);
    setThinkingState("triaging");
    try {
      setTimeout(() => setThinkingState("reasoning"), 280);
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
      setThinkingState("validating");
      await streamAssistant(assistantMessageId, payload.answer);
      setMessages((prev) => prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, text: payload.answer, response: payload, state: "complete" } : msg)));
      setActiveFollowUps([
        payload.contextGapQuestions?.[0] || "Which dependency is now most likely to slip delivery this week?",
        "Draft my next sponsor update from this response.",
        selectedProject ? `What is the next highest-impact action for ${selectedProject.projectName}?` : "What should I escalate in the next 24 hours?",
      ]);
    } catch (e) {
      const failure = e instanceof Error ? e.message : "Unable to get PMFreak Copilot response.";
      setError(failure);
      setLastFailedMessage(message);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId ? { ...msg, text: "PMFreak lost signal while compiling guidance. Retry to continue continuity.", state: "error" } : msg,
        ),
      );
    } finally {
      setThinkingState("idle");
      setLoading(false);
    }
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!selectedProject?.id) {
      setError("Select a project before uploading documents in Copilot.");
      return;
    }

    const body = new FormData();
    body.append("projectId", selectedProject.id);
    Array.from(files).forEach((file) => body.append("documents", file));

    try {
      const response = await fetch("/api/upload", { method: "POST", body });
      const payload = (await response.json()) as UploadApiResponse;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.ok ? "Upload failed." : payload.error);
      }
      setUploadedFiles((prev) => [...payload.uploadedFileNames, ...prev].slice(0, 6));
      setError(null);
      const ingestionSummary = `Uploaded ${payload.uploadedCount} document(s). Detected ${payload.ingestion.extractedSignals.risks} risks and ${payload.ingestion.extractedSignals.stakeholders} stakeholders.`;
      setMessages((prev) => [...prev, { id: `assistant-upload-${Date.now()}`, role: "assistant", text: ingestionSummary, state: "complete" }]);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Upload failed. Please try again.");
    }
  };

  return (
    <div className="min-h-[80vh]">
      <main className="mx-auto grid w-full gap-4 xl:grid-cols-[1fr_280px]">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-4 md:p-6">
          <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">PMFreak Copilot</p>
              <h1 className="mt-1 text-2xl font-semibold">Executive Copilot</h1>
              <p className="mt-1 text-sm text-slate-300">Ask once. PMFreak distills complexity into clear operational judgment with full depth running quietly underneath.</p>
              <p className="mt-2 text-xs text-cyan-200">First 5 minutes: pick project scope, ask one risk question, then request an escalation-ready message.</p>
            </div>
            <div className="flex gap-2">
              <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)} className="rounded-xl border border-white/15 bg-white/30 px-3 py-2 text-xs">
                <option value="">All projects</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.projectName}</option>)}
              </select>
              <select value={methodology} onChange={(e) => setMethodology(e.target.value as never)} className="rounded-xl border border-white/15 bg-white/30 px-3 py-2 text-xs">
                <option>Hybrid</option><option>PMI</option><option>Agile</option><option>General PMO</option>
              </select>
            </div>
          </header>

          {messages.length === 0 ? (
            <section className="mb-4 rounded-2xl border border-cyan-300/35 bg-cyan-400/10 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">First-session guide</p>
              <h2 className="mt-1 text-lg font-semibold">Start with one real operational question</h2>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {Object.entries(FIRST_SESSION_PROMPTS).map(([group, prompts]) => (
                  <div key={group} className="rounded-xl border border-white/15 bg-black/10 p-3">
                    <p className="text-xs uppercase tracking-wide text-cyan-100">{group}</p>
                    <div className="mt-2 space-y-2">
                      {prompts.map((prompt) => (
                        <button key={prompt} type="button" onClick={() => void send(prompt)} className="block w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-left text-xs text-slate-200 hover:border-cyan-300/60">
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}


          <div className="mb-4 flex flex-wrap gap-2">
            {activeFollowUps.map((prompt) => <button key={prompt} onClick={() => void send(prompt)} className="rounded-full border border-white/20 px-3 py-1 text-xs text-slate-200 transition hover:-translate-y-0.5 hover:border-cyan-300/40 hover:bg-cyan-300/10">{prompt}</button>)}
          </div>

          <div
            onDrop={(e) => { e.preventDefault(); setDragActive(false); void handleUpload(e.dataTransfer.files); }}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            className={`min-h-[520px] rounded-2xl border p-4 transition ${dragActive ? "border-cyan-300/50 bg-cyan-400/5" : "border-white/10 bg-white/20"}`}
          >
            <div className="space-y-3">
              {messages.length === 0 ? <p className="text-sm text-slate-300">Start with one question. PMFreak will surface only the highest-signal operational insight first.</p> : null}
              {messages.map((msg) => (
                <article key={msg.id} className={`max-w-3xl rounded-2xl p-3 text-sm transition-all ${msg.role === "user" ? "ml-auto bg-cyan-500/20" : "bg-slate-800/70"} ${msg.state === "streaming" ? "ring-1 ring-cyan-300/30" : ""}`}>
                  <p>{msg.text}</p>
                  {msg.role === "assistant" && msg.state === "streaming" ? <p className="mt-2 text-[11px] text-cyan-200 animate-pulse">typing operational guidance…</p> : null}
                  {msg.role === "assistant" && msg.state === "error" ? <p className="mt-2 text-[11px] text-rose-200">degraded AI state — conversation memory retained</p> : null}
                </article>
              ))}
              {loading ? <p className="text-sm text-slate-300 animate-pulse">Thinking: {thinkingState === "triaging" ? "triaging operational signals" : thinkingState === "reasoning" ? "running PM reasoning pass" : "validating intervention quality"}…</p> : null}
              {error ? <p className="text-sm text-rose-200">{error}</p> : null}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => void handleUpload(e.target.files)} />
            <div className="flex gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask for the next decision, risk, or action…" className="flex-1 rounded-xl border border-white/10 bg-white/30 px-4 py-3 text-sm" />
              <button onClick={() => void send()} disabled={loading} className="rounded-xl border border-cyan-300/50 px-4 py-2 text-sm font-semibold">Send</button>
            </div>
            {lastFailedMessage ? (
              <button onClick={() => void send(lastFailedMessage)} className="rounded-xl border border-amber-300/40 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
                Retry last prompt with memory continuity
              </button>
            ) : null}
            <div className="flex items-center gap-2 text-xs">
              <select value={memoryDomain} onChange={(e) => setMemoryDomain(e.target.value as (typeof MEMORY_DOMAINS)[number])} className="rounded-lg border border-white/15 bg-white/30 px-2 py-1">
                {MEMORY_DOMAINS.map((domain) => <option key={domain} value={domain}>{domain}</option>)}
              </select>
              <button onClick={async () => { if (!input.trim()) return; await fetch("/api/operational-memory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ domain: memoryDomain, title: "General chat routed insight", text: input, sourceRef: "copilot" }) }); }} className="text-cyan-200">Route insight to domain</button>
            </div>
            <button onClick={() => fileInputRef.current?.click()} className="text-xs text-cyan-200">+ Drop or attach project files to enrich context</button>
          </div>
        </section>

        <aside className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-200">Operational pulse</h2>
          <article className="rounded-2xl border border-cyan-300/25 bg-cyan-950/20 p-3 text-xs text-cyan-100">
            <p className="text-cyan-200">Hero insight</p>
            <p className="mt-1">{executionRisk?.commentary[0] ?? coordination?.commentary[0] ?? "Operational signal model is warming up. Ask one focused question for sharper intelligence."}</p>
          </article>

          <div className="grid grid-cols-2 gap-2">
            <article className="rounded-xl border border-white/10 bg-white/20 p-3 text-xs text-slate-200">
              <p className="text-slate-400">Delivery</p>
              <p className="mt-1 font-semibold uppercase">{executionRisk?.deliveryConfidence ?? "medium"}</p>
            </article>
            <article className="rounded-xl border border-white/10 bg-white/20 p-3 text-xs text-slate-200">
              <p className="text-slate-400">Escalation</p>
              <p className="mt-1 font-semibold uppercase">{executionRisk?.activeEscalationRisk ?? "watch"}</p>
            </article>
            <article className="rounded-xl border border-white/10 bg-white/20 p-3 text-xs text-slate-200">
              <p className="text-slate-400">Intervention</p>
              <p className="mt-1 font-semibold uppercase">{intervention?.interventionUrgency ?? "watch"}</p>
            </article>
            <article className="rounded-xl border border-white/10 bg-white/20 p-3 text-xs text-slate-200">
              <p className="text-slate-400">Alignment</p>
              <p className="mt-1 font-semibold uppercase">{stakeholderIntel?.executiveAlignment ?? "mixed"}</p>
            </article>
          </div>

          <details className="rounded-2xl border border-white/10 bg-white/15 p-3 text-xs text-slate-200">
            <summary className="cursor-pointer font-semibold text-slate-100">Top action queue</summary>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-slate-300">
              {(coordination?.operational_priority_queue.actions.slice(0, 3) ?? []).map((action) => (
                <li key={action.actionId}>#{action.recommendedExecutionOrder} {action.type} · {action.targetStakeholder}</li>
              ))}
            </ul>
          </details>

          <details className="rounded-2xl border border-white/10 bg-white/15 p-3 text-xs text-slate-200">
            <summary className="cursor-pointer font-semibold text-slate-100">Memory highlights</summary>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-slate-300">
              {(ambientMemory.criticalRisks.length ? ambientMemory.criticalRisks : ["No critical risks detected yet."]).slice(0, 2).map((item) => <li key={item}>{item}</li>)}
              {(ambientMemory.blockers.length ? ambientMemory.blockers : ["No blockers detected yet."]).slice(0, 1).map((item) => <li key={item}>{item}</li>)}
            </ul>
          </details>

          <details className="rounded-2xl border border-white/10 bg-white/15 p-3 text-xs text-slate-200">
            <summary className="cursor-pointer font-semibold text-slate-100">Deep signals</summary>
            <div className="mt-2 space-y-2 text-slate-300">
              <p>Pressure: {executionRisk?.stakeholderPressure ?? "low"} · Stability: {executionRisk?.executionStability ?? "watching"}</p>
              <p>Escalation trajectory: {stakeholderIntel?.escalationTrajectory ?? "reactive"}</p>
              <p>Recovery: {coordination?.execution_recovery_path.commentary[0] ?? "Recovery workflow warming up."}</p>
              <p>Recent uploads: {uploadedFiles.length ? uploadedFiles.slice(0, 2).join(", ") : "None"}</p>
            </div>
          </details>
        </aside>
      </main>
    </div>
  );
}
