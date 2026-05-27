"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AgentAwakeningPanel } from "@/components/pmfreak/workspace/agent-awakening-panel";
import { ImprintSummary } from "@/components/pmfreak/workspace/imprint-summary";
import { WORKSPACE_DISPLAY } from "@/lib/workspace/display-semantics";
import { deriveAwakeningState, type AwakeningState } from "@/lib/workspace/awakening-state";
import { isMeaningfulOperationalContact } from "@/lib/workspace/first-contact-detector";
import { computeImprintConfidence } from "@/lib/workspace/imprint-confidence";
import {
  computeAdaptiveClarifyingQuestion,
  computeIgnitionCues,
  observeInteraction,
} from "@/lib/workspace/imprint-inference";
import {
  emptyImprintState,
  loadImprintState,
  persistImprintState,
  type PMImprintState,
} from "@/lib/workspace/operational-imprint-profile";
import { isRuntimeValidationEnabled } from "@/lib/workspace/beta-validation-mode";
import { buildValidationTrace, VALIDATION_CONFIDENCE_LABELS } from "@/lib/workspace/validation-trace-builder";
import { detectContradiction } from "@/lib/workspace/validation-consistency";
import {
  addTrace,
  applyFeedback,
  emptyValidationState,
  loadValidationState,
  persistValidationState,
  type ValidationFeedback,
  type ValidationState,
  type ValidationTrace,
} from "@/lib/workspace/runtime-validation";
import { RuntimeTrustPanel } from "@/components/pmfreak/workspace/runtime-trust-panel";
import { ValidationTimeline } from "@/components/pmfreak/workspace/validation-timeline";
import { ValidationReplay } from "@/components/pmfreak/workspace/validation-replay";

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
  runtimeResponse?: { observation: string; interpretation: string; supportingEvidence: string[]; confidence: string; suggestedActions: string[]; followUps: string[]; trustNotes: string[] };
  operationalPlans?: Array<{ id: string; title: string; status: string; severity: string; confidence: string; supportingEvidence: string[]; operationalSequence: Array<{ id: string; action: string; priority: number; ownerSuggestion?: string; status: string }> }>;
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
  trace?: ValidationTrace;
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

const MEMORY_DOMAINS = ["stakeholder_intelligence","delivery_intelligence","risk_intelligence","pmo_governance","team_health","executive_context","operational_memory","operational_plans"] as const;
const SESSION_KEY = "copilot-shell-v1";
const IMPRINT_COMPANY_ID = "global";
const IMPRINT_WORKSPACE_ID = "default";
const IMPRINT_USER_ID = "default";

const QUICK_NUDGES = [
  "What is the single most important risk right now?",
  "Give me the top 3 actions for the next 24 hours.",
  "Draft an executive-ready status update in 6 bullets.",
  "Which issue should I escalate today, and to whom?",
  "What are stakeholders likely to challenge in tomorrow's review?",
];

// Stage chip display
const STAGE_CHIP: Record<AwakeningState["stage"], { label: string; style: string }> = {
  dormant:           { label: WORKSPACE_DISPLAY.states.standby,      style: "border-zinc-600/30 bg-zinc-500/[0.08] text-zinc-500" },
  initializing:      { label: WORKSPACE_DISPLAY.states.initializing, style: "border-amber-400/30 bg-amber-400/[0.08] text-amber-300" },
  orienting:         { label: WORKSPACE_DISPLAY.states.orienting,    style: "border-cyan-400/30 bg-cyan-400/[0.08] text-cyan-300" },
  engaged:           { label: WORKSPACE_DISPLAY.states.active,       style: "border-emerald-400/30 bg-emerald-400/[0.08] text-emerald-200" },
  expanded:          { label: WORKSPACE_DISPLAY.states.active,       style: "border-emerald-400/30 bg-emerald-400/[0.08] text-emerald-200" },
  "fully-operational": { label: WORKSPACE_DISPLAY.states.active,    style: "border-emerald-400/30 bg-emerald-400/[0.08] text-emerald-200" },
};

type Props = {
  awakening: AwakeningState;
  onAwakeningAdvance: (state: AwakeningState) => void;
};

export function WorkspaceConversationShell({ awakening, onAwakeningAdvance }: Props) {
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
  const [imprintState, setImprintState] = useState<PMImprintState>(() => emptyImprintState());
  const [validationState, setValidationState] = useState<ValidationState>(() => emptyValidationState());
  const [validationEnabled] = useState(() => isRuntimeValidationEnabled());
  const pendingTraceRef = useRef<ValidationTrace | null>(null);
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
    setImprintState(loadImprintState(IMPRINT_COMPANY_ID, IMPRINT_WORKSPACE_ID, IMPRINT_USER_ID));
  }, []);

  useEffect(() => {
    if (validationEnabled) {
      setValidationState(loadValidationState(IMPRINT_COMPANY_ID, IMPRINT_WORKSPACE_ID, IMPRINT_USER_ID));
    }
  }, [validationEnabled]);

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

    // Advance awakening and observe imprint on meaningful operational signal
    if (isMeaningfulOperationalContact(message)) {
      const nextCount = awakening.interactionCount + 1;
      const nextAwakening = deriveAwakeningState(nextCount);
      onAwakeningAdvance(nextAwakening);
      const nextImprint = observeInteraction(message, imprintState);
      setImprintState(nextImprint);
      persistImprintState(IMPRINT_COMPANY_ID, IMPRINT_WORKSPACE_ID, IMPRINT_USER_ID, nextImprint);
      if (validationEnabled) {
        const contradiction = detectContradiction(message, imprintState);
        const trace = buildValidationTrace(
          nextAwakening,
          nextImprint,
          computeImprintConfidence(nextImprint.profile),
          validationState.feedbackBias,
          contradiction.hasContradiction,
          message.slice(0, 80),
        );
        pendingTraceRef.current = trace;
        const nextVState = addTrace(validationState, trace);
        setValidationState(nextVState);
        persistValidationState(IMPRINT_COMPANY_ID, IMPRINT_WORKSPACE_ID, IMPRINT_USER_ID, nextVState);
      }
    }

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
          activeDomain: memoryDomain,
          sessionKey: SESSION_KEY,
        }),
      });
      const payload = (await response.json()) as CopilotResponse & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to get PMFreak Workspace response.");
      setThinkingState("validating");
      await streamAssistant(assistantMessageId, payload.answer);
      setMessages((prev) => prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, text: payload.answer, response: payload, state: "complete", trace: pendingTraceRef.current ?? undefined } : msg)));
      pendingTraceRef.current = null;
      const adaptiveClarifier = computeAdaptiveClarifyingQuestion(
        imprintState.profile,
        computeImprintConfidence(imprintState.profile),
      );
      setActiveFollowUps([
        payload.contextGapQuestions?.[0] || adaptiveClarifier,
        "Draft my next sponsor update from this response.",
        selectedProject ? `What is the next highest-impact action for ${selectedProject.projectName}?` : "What should I escalate in the next 24 hours?",
      ]);
    } catch (e) {
      const failure = e instanceof Error ? e.message : "Unable to get PMFreak Workspace response.";
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
      setError("Select a project before uploading workspace documents.");
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

  const isDormant = awakening.stage === "dormant";
  const stageChip = STAGE_CHIP[awakening.stage];
  const imprintConfidence = computeImprintConfidence(imprintState.profile);
  const ignitionCues = useMemo(
    () => computeIgnitionCues(imprintState.profile, imprintConfidence),
    [imprintState.profile, imprintConfidence],
  );

  return (
    <main className="mx-auto grid min-h-[82vh] w-full gap-5 xl:grid-cols-[1fr_300px]">
      <section className="rounded-3xl border border-white/10 bg-slate-900/55 p-4 shadow-[0_30px_70px_-50px_rgba(15,23,42,0.95)] backdrop-blur-xl md:p-6">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">PMFreak Workspace</p>
            <h1 className="mt-1 text-2xl font-semibold">Operational Command Center</h1>
            {isDormant ? (
              <p className="mt-1 text-sm text-slate-500">
                {WORKSPACE_DISPLAY.labels.dormantInvitation}
              </p>
            ) : (
              <p className="mt-1 text-sm text-slate-300">Ask once. PMFreak distills complexity into clear operational judgment with full depth running quietly underneath.</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.16em] transition-colors ${stageChip.style}`}>
              {stageChip.label}
            </span>
            {validationEnabled && validationState.traces.length > 0 ? (
              <span className="rounded-full border border-violet-400/30 bg-violet-400/[0.08] px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-violet-300/80 transition-colors">
                {VALIDATION_CONFIDENCE_LABELS[validationState.currentConfidence]}
              </span>
            ) : null}
            <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)} className="rounded-xl border border-white/15 bg-white/30 px-3 py-2 text-xs">
              <option value="">All projects</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.projectName}</option>)}
            </select>
            <select value={methodology} onChange={(e) => setMethodology(e.target.value as never)} className="rounded-xl border border-white/15 bg-white/30 px-3 py-2 text-xs">
              <option>Hybrid</option><option>PMI</option><option>Agile</option><option>General PMO</option>
            </select>
          </div>
        </header>

        {/* Dormant state — operational ignition cues */}
        {isDormant && messages.length === 0 ? (
          <section className="mb-4 rounded-2xl border border-white/[0.06] bg-white/[0.01] p-5">
            <p className="text-[11px] text-slate-600">{WORKSPACE_DISPLAY.labels.dormantSignalHint}</p>
            <div className="mt-4 space-y-2">
              {ignitionCues.map((cue) => (
                <button
                  key={cue}
                  type="button"
                  onClick={() => void send(cue)}
                  className="block w-full rounded-xl border border-white/[0.06] bg-white/[0.01] px-4 py-2.5 text-left text-xs text-slate-400 transition hover:border-cyan-300/20 hover:text-slate-200"
                >
                  {cue}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {/* Follow-up nudges — only after conversation has started */}
        {messages.length > 0 ? (
          <div className="mb-4 flex flex-wrap gap-2">
            {activeFollowUps.map((prompt) => (
              <button key={prompt} onClick={() => void send(prompt)} className="rounded-full border border-white/15 bg-white/[0.02] px-3 py-1.5 text-xs text-slate-200 transition hover:border-cyan-300/35 hover:bg-cyan-300/[0.08]">
                {prompt}
              </button>
            ))}
          </div>
        ) : null}

        <div
          onDrop={(e) => { e.preventDefault(); setDragActive(false); void handleUpload(e.dataTransfer.files); }}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          className={`min-h-[560px] rounded-2xl border p-4 transition ${dragActive ? "border-cyan-300/50 bg-cyan-400/5" : "border-white/10 bg-slate-950/50"}`}
        >
          <div className="space-y-3">
            {messages.map((msg) => (
              <article key={msg.id} className={`max-w-3xl rounded-2xl p-3 text-sm transition-all ${msg.role === "user" ? "ml-auto border border-cyan-300/20 bg-cyan-400/[0.12]" : "border border-white/10 bg-slate-900/80"} ${msg.state === "streaming" ? "ring-1 ring-cyan-300/30" : ""}`}>
                <p>{msg.text}</p>
                {msg.role === "assistant" && msg.state === "streaming" ? <p className="mt-2 text-[11px] text-cyan-200 animate-pulse">typing operational guidance…</p> : null}
                {msg.role === "assistant" && msg.state === "error" ? <p className="mt-2 text-[11px] text-rose-200">degraded AI state — conversation memory retained</p> : null}
                {msg.role === "assistant" && msg.response?.runtimeResponse ? <div className="mt-3 space-y-2 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs text-slate-200"><p><span className="text-slate-400">Observation:</span> {msg.response.runtimeResponse.observation}</p><p><span className="text-slate-400">Interpretation:</span> {msg.response.runtimeResponse.interpretation}</p><p><span className="text-slate-400">Confidence:</span> {msg.response.runtimeResponse.confidence}</p><ul className="list-disc pl-4 text-slate-300">{msg.response.runtimeResponse.supportingEvidence.map((item) => <li key={item}>{item}</li>)}</ul>{msg.response.runtimeResponse.trustNotes.length ? <p className="text-amber-200">Trust notes: {msg.response.runtimeResponse.trustNotes.join(" ")}</p> : null}</div> : null}
                {msg.role === "assistant" && msg.state === "complete" && msg.trace && validationEnabled ? (
                  <details className="mt-2 rounded-lg border border-white/[0.05] bg-white/[0.01] p-2 text-[11px]">
                    <summary className="cursor-pointer select-none text-zinc-600">Why this response</summary>
                    <div className="mt-1.5 space-y-0.5">
                      <p className="text-zinc-600 mb-1">Generated from:</p>
                      {msg.trace.continuitySignals.map((sig) => (
                        <p key={sig} className="flex items-start gap-1.5 text-slate-500">
                          <span className="mt-0.5 shrink-0 text-violet-500/50">•</span>
                          {sig}
                        </p>
                      ))}
                      {msg.trace.activeSources.slice(0, 3).map((src) => (
                        <p key={src} className="flex items-start gap-1.5 text-zinc-600">
                          <span className="mt-0.5 shrink-0">•</span>
                          {src} signal active
                        </p>
                      ))}
                    </div>
                  </details>
                ) : null}
                {msg.role === "assistant" && msg.response?.operationalPlans?.length ? (
                  <div className="mt-3 space-y-2 rounded-xl border border-cyan-300/20 bg-cyan-400/5 p-3 text-xs">
                    <p className="font-semibold text-cyan-100">Operational Plans</p>
                    {msg.response.operationalPlans.map((plan) => (
                      <div key={plan.id} className="rounded-lg border border-cyan-200/15 p-2 text-slate-200">
                        <p>{plan.title} · {plan.status} · {plan.severity} · {plan.confidence}</p>
                        <ul className="list-disc pl-4">{plan.operationalSequence.slice(0, 3).sort((a, b) => a.priority - b.priority).map((step) => <li key={step.id}>P{step.priority}: {step.action} {step.ownerSuggestion ? `(owner: ${step.ownerSuggestion})` : ""}</li>)}</ul>
                      </div>
                    ))}
                  </div>
                ) : null}
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
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isDormant ? "What needs operational attention?" : "Ask for the next decision, risk, or action…"}
              className="flex-1 rounded-xl border border-white/15 bg-slate-950/75 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300/70"
            />
            <button onClick={() => void send()} disabled={loading} className="rounded-xl border border-cyan-200/45 bg-cyan-400/[0.08] px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/[0.16]">Send</button>
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

      <aside className="space-y-3 rounded-3xl border border-white/10 bg-slate-900/55 p-4 backdrop-blur-xl">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-200">Operational pulse</h2>
        <article className="rounded-2xl border border-cyan-300/25 bg-cyan-950/20 p-3 text-xs text-cyan-100">
          <p className="text-cyan-200">Hero insight</p>
          <p className="mt-1">{executionRisk?.commentary[0] ?? coordination?.commentary[0] ?? "Standby. Ask one focused question."}</p>
        </article>

        <div className="grid grid-cols-2 gap-2">
          <article className="rounded-xl border border-white/10 bg-slate-950/50 p-3 text-xs text-slate-200">
            <p className="text-slate-400">Memory</p>
            <p className="mt-1 font-semibold uppercase">{isDormant ? "Standby" : "Seeding"}</p>
          </article>
          <article className="rounded-xl border border-white/10 bg-slate-950/50 p-3 text-xs text-slate-200">
            <p className="text-slate-400">Delivery</p>
            <p className="mt-1 font-semibold uppercase">{isDormant ? "Awaiting signal" : (executionRisk?.deliveryConfidence ?? "orienting")}</p>
          </article>
          <article className="rounded-xl border border-white/10 bg-slate-950/50 p-3 text-xs text-slate-200">
            <p className="text-slate-400">Stakeholders</p>
            <p className="mt-1 font-semibold uppercase">{awakening.awakenedAgents.includes("stakeholders") ? (stakeholderIntel?.executiveAlignment ?? "mixed") : "Dormant"}</p>
          </article>
          <article className="rounded-xl border border-white/10 bg-slate-950/50 p-3 text-xs text-slate-200">
            <p className="text-slate-400">Escalation</p>
            <p className="mt-1 font-semibold uppercase">{awakening.awakenedAgents.includes("risk") ? (executionRisk?.activeEscalationRisk ?? "watch") : "Pending"}</p>
          </article>
        </div>

        {/* Agent awakening panel */}
        <AgentAwakeningPanel
          state={awakening}
          imprintProfile={imprintState.profile}
          imprintConfidence={imprintConfidence}
        />

        {/* Imprint transparency surface — visible after stable confidence */}
        <ImprintSummary
          profile={imprintState.profile}
          companyId={IMPRINT_COMPANY_ID}
          workspaceId={IMPRINT_WORKSPACE_ID}
          userId={IMPRINT_USER_ID}
          onReset={() => setImprintState(emptyImprintState())}
        />

        {/* Runtime trust observability surfaces — gated by beta validation mode */}
        {validationEnabled ? (
          <>
            <RuntimeTrustPanel
              traces={validationState.traces}
              currentConfidence={validationState.currentConfidence}
              onFeedback={(traceId: string, feedback: ValidationFeedback) => {
                const nextVState = applyFeedback(validationState, feedback, traceId);
                setValidationState(nextVState);
                persistValidationState(IMPRINT_COMPANY_ID, IMPRINT_WORKSPACE_ID, IMPRINT_USER_ID, nextVState);
              }}
            />
            <ValidationTimeline traces={validationState.traces} />
            <ValidationReplay traces={validationState.traces} />
          </>
        ) : null}

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
            <p>Recovery: {coordination?.execution_recovery_path.commentary[0] ?? "Standby."}</p>
            <p>Recent uploads: {uploadedFiles.length ? uploadedFiles.slice(0, 2).join(", ") : "None"}</p>
          </div>
        </details>
      </aside>
    </main>
  );
}
