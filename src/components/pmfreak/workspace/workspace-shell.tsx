"use client";

import { useCallback, useEffect, useState } from "react";
import { WorkspaceConversationShell } from "@/components/pmfreak/workspace/workspace-conversation-shell";
import { WORKSPACE_DISPLAY } from "@/lib/workspace/display-semantics";
import { AWAKENING_EVENT, deriveAwakeningState, type AwakeningState } from "@/lib/workspace/awakening-state";
import { CONFIDENCE_CHIP_LABELS, computeImprintConfidence } from "@/lib/workspace/imprint-confidence";
import { type PMOperationalImprint } from "@/lib/workspace/operational-imprint-profile";
import { bootstrapRuntimeState } from "@/lib/workspace/runtime-bootstrap";
import { runtimePersistence, type RuntimePersistenceScope, type RuntimeHydrationIntegrity, type RuntimeSyncStatus } from "@/lib/workspace/runtime-persistence";
import { RuntimePersistenceStatus } from "@/components/pmfreak/workspace/runtime-persistence-status";

const COMPANY_ID = "global";
const WORKSPACE_ID = "default";
const USER_ID = "default";
const RUNTIME_SCOPE: RuntimePersistenceScope = { companyId: COMPANY_ID, workspaceId: WORKSPACE_ID, userId: USER_ID };

const GOVERNANCE_SECTIONS = ["Portfolio", "PMO", "Projects", "Stakeholders", "Scope", "Timeline", "Cost", "RAID", "Delivery", "Memory"];

const DORMANT_CHIPS = [WORKSPACE_DISPLAY.states.standby] as const;
const ACTIVE_CHIPS = [
  WORKSPACE_DISPLAY.readiness.live,
  WORKSPACE_DISPLAY.readiness.context,
  WORKSPACE_DISPLAY.readiness.memory,
  WORKSPACE_DISPLAY.readiness.ready,
] as const;

export function WorkspaceShell() {
  const [awakening, setAwakening] = useState<AwakeningState>(() => deriveAwakeningState(0));
  const [imprintProfile, setImprintProfile] = useState<PMOperationalImprint | null>(null);
  const [hydrationIntegrity, setHydrationIntegrity] = useState<RuntimeHydrationIntegrity>("healthy");
  const [syncStatus, setSyncStatus] = useState<RuntimeSyncStatus>("synced");
  const [lastCheckpoint, setLastCheckpoint] = useState<number | null>(null);
  const [resumeLabel, setResumeLabel] = useState("Continuity restored");

  useEffect(() => {
    void bootstrapRuntimeState(RUNTIME_SCOPE).then((boot) => {
      setAwakening(boot.awakening);
      setImprintProfile(boot.imprint.profile);
      setHydrationIntegrity(boot.integrity);
      setResumeLabel(boot.resumedLabel);
    }).catch(() => setHydrationIntegrity("recovered"));
  }, []);

  const handleAwakeningAdvance = useCallback((next: AwakeningState) => {
    setAwakening(next);
    setSyncStatus("syncing");
    void runtimePersistence.persistAwakening(RUNTIME_SCOPE, next).then(() => { setSyncStatus("synced"); setLastCheckpoint(Date.now()); }).catch(() => setSyncStatus("fallback"));
    window.dispatchEvent(new CustomEvent(AWAKENING_EVENT, { detail: next }));
  }, []);

  const isDormant = awakening.stage === "dormant";
  const chips = isDormant ? DORMANT_CHIPS : ACTIVE_CHIPS;
  const chipStyle = isDormant
    ? "rounded-full border border-zinc-600/30 bg-zinc-500/[0.08] px-3 py-1 text-xs text-zinc-500"
    : "rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-100";
  const imprintConfidence = imprintProfile ? computeImprintConfidence(imprintProfile) : null;
  const showImprintChip = imprintConfidence && imprintConfidence !== "forming";

  return (
    <section className="grid min-h-[calc(100vh-10rem)] gap-6 lg:grid-cols-[240px_1fr_280px]">
      <aside className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <h2 className="text-sm font-semibold text-slate-100">Governance</h2>
        <ul className="mt-4 space-y-2 text-xs text-slate-300">
          {GOVERNANCE_SECTIONS.map((section) => (
            <li key={section} className="rounded-lg border border-white/10 px-3 py-2">{section}</li>
          ))}
        </ul>
      </aside>

      <main className="space-y-4">
        <div className="rounded-2xl border border-cyan-400/25 bg-slate-900/70 p-4">
          <p className="text-sm font-semibold text-cyan-100">{WORKSPACE_DISPLAY.labels.workspace}</p>
          <p className="mt-1 text-xs text-slate-400">
            {isDormant ? WORKSPACE_DISPLAY.labels.standbySubtitle : resumeLabel}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {chips.map((chip) => (
              <span key={chip} className={chipStyle}>{chip}</span>
            ))}
            {showImprintChip ? (
              <span className="rounded-full border border-indigo-400/25 bg-indigo-400/[0.07] px-3 py-1 text-xs text-indigo-300/80">
                {CONFIDENCE_CHIP_LABELS[imprintConfidence]}
              </span>
            ) : null}
          </div>
        </div>
        <RuntimePersistenceStatus betaMode syncStatus={syncStatus} lastCheckpoint={lastCheckpoint} integrity={hydrationIntegrity} />
        <WorkspaceConversationShell
          scope={RUNTIME_SCOPE}
          awakening={awakening}
          onAwakeningAdvance={handleAwakeningAdvance}
        />
      </main>

      <aside className="rounded-2xl border border-white/10 bg-black/20 p-4 text-xs text-slate-300">
        <h2 className="text-sm font-semibold text-slate-100">Operational intelligence</h2>
        <ul className="mt-3 space-y-2">
          <li className="rounded-lg border border-white/10 px-3 py-2">Workspace: Enterprise PMO</li>
          <li className="rounded-lg border border-white/10 px-3 py-2">Project: Recovery watch</li>
          <li className="rounded-lg border border-white/10 px-3 py-2">Decisions: 2 pending asks</li>
          <li className="rounded-lg border border-white/10 px-3 py-2">Memory: {WORKSPACE_DISPLAY.states.healthy}</li>
          <li className="rounded-lg border border-white/10 px-3 py-2">Intervention: {WORKSPACE_DISPLAY.states.alignment}</li>
        </ul>
      </aside>
    </section>
  );
}
