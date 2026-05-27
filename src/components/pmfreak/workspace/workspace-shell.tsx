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

export function WorkspaceShell() {
  const [awakening, setAwakening] = useState<AwakeningState>(() => deriveAwakeningState(0));

  useEffect(() => {
    void bootstrapRuntimeState(RUNTIME_SCOPE).then((boot) => {
      setAwakening(boot.awakening);
    }).catch(() => undefined);
  }, []);

  const handleAwakeningAdvance = useCallback((next: AwakeningState) => {
    setAwakening(next);
    void runtimePersistence.persistAwakening(RUNTIME_SCOPE, next).catch(() => undefined);
    window.dispatchEvent(new CustomEvent(AWAKENING_EVENT, { detail: next }));
  }, []);

  return (
    <section className="mx-auto min-h-[calc(100vh-10rem)] w-full max-w-[1220px]">
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
