"use client";

import { useCallback, useEffect, useState } from "react";
import { WorkspaceConversationShell } from "@/components/pmfreak/workspace/workspace-conversation-shell";
import { AWAKENING_EVENT, deriveAwakeningState, type AwakeningState } from "@/lib/workspace/awakening-state";
import { bootstrapRuntimeState } from "@/lib/workspace/runtime-bootstrap";
import { runtimePersistence, type RuntimePersistenceScope } from "@/lib/workspace/runtime-persistence";

const COMPANY_ID = "global";
const WORKSPACE_ID = "default";
const USER_ID = "default";
const RUNTIME_SCOPE: RuntimePersistenceScope = { companyId: COMPANY_ID, workspaceId: WORKSPACE_ID, userId: USER_ID };

type PmoContext = {
  found: boolean;
  pmoName?: string;
  organizationName?: string;
  pmoType?: string;
  methodology?: string;
};

export function WorkspaceShell() {
  const [awakening, setAwakening] = useState<AwakeningState>(() => deriveAwakeningState(0));
  const [pmoContext, setPmoContext] = useState<PmoContext | null>(null);

  useEffect(() => {
    void bootstrapRuntimeState(RUNTIME_SCOPE).then((boot) => {
      setAwakening(boot.awakening);
    }).catch(() => undefined);

    void fetch("/api/pmo/context")
      .then((r) => r.json() as Promise<PmoContext>)
      .then((ctx) => setPmoContext(ctx))
      .catch(() => undefined);
  }, []);

  const handleAwakeningAdvance = useCallback((next: AwakeningState) => {
    setAwakening(next);
    void runtimePersistence.persistAwakening(RUNTIME_SCOPE, next).catch(() => undefined);
    window.dispatchEvent(new CustomEvent(AWAKENING_EVENT, { detail: next }));
  }, []);

  return (
    <section className="mx-auto min-h-[calc(100vh-10rem)] w-full max-w-[1220px]">
      {pmoContext?.found && pmoContext.pmoName && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-cyan-300/20 bg-cyan-400/[0.04] px-4 py-3">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
          <span className="text-sm text-slate-300">
            <span className="font-semibold text-white">{pmoContext.pmoName}</span>
            {pmoContext.organizationName ? (
              <span className="text-zinc-500"> · {pmoContext.organizationName}</span>
            ) : null}
            {pmoContext.methodology ? (
              <span className="ml-3 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-zinc-500">
                {pmoContext.methodology}
              </span>
            ) : null}
          </span>
        </div>
      )}
      <main>
        <WorkspaceConversationShell
          scope={RUNTIME_SCOPE}
          awakening={awakening}
          onAwakeningAdvance={handleAwakeningAdvance}
        />
      </main>
    </section>
  );
}
