export type RuntimeConversationState = {
  projectId: string | null;
  workspaceId: string | null;
  sessionKey: string;
  activeDomain: string;
  recentQuestions: string[];
  referencedEntities: string[];
  referencedBlockers: string[];
  referencedInterventions: string[];
  referencedStakeholders: string[];
  recentEvidence: string[];
  updatedAt: string;
};

const MAX_RECENT = 8;
const ttlMs = 1000 * 60 * 60;
const sessionStore = new Map<string, RuntimeConversationState>();

const pickMatches = (text: string, patterns: RegExp[]) => {
  const matches = new Set<string>();
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const value = match[0]?.trim();
      if (value) matches.add(value);
    }
  }
  return Array.from(matches);
};

const compact = (items: string[]) => Array.from(new Set(items.map((item) => item.trim()).filter(Boolean))).slice(-MAX_RECENT);

function computeStateKey({ companyId, workspaceId, projectId, sessionKey }: { companyId: string; workspaceId: string | null; projectId: string | null; sessionKey: string }) {
  return `${companyId}:${workspaceId ?? "workspace-none"}:${projectId ?? "project-none"}:${sessionKey}`;
}

export function loadRuntimeConversationState(params: { companyId: string; workspaceId: string | null; projectId: string | null; sessionKey: string }) {
  const key = computeStateKey(params);
  const current = sessionStore.get(key);
  if (!current) return null;
  if (Date.now() - Date.parse(current.updatedAt) > ttlMs) {
    sessionStore.delete(key);
    return null;
  }
  return current;
}

export function updateRuntimeConversationState(params: {
  companyId: string;
  workspaceId: string | null;
  projectId: string | null;
  sessionKey: string;
  activeDomain?: string;
  message: string;
  evidenceRefs: string[];
}) {
  const key = computeStateKey(params);
  const previous = loadRuntimeConversationState(params);
  const text = params.message.toLowerCase();

  const entities = pickMatches(text, [/\b(blocker|dependency|risk|stakeholder|escalation|governance|intervention|timeline|owner(ship)?)\b/g]);
  const blockers = pickMatches(text, [/\bblocker[s]?\b/g, /\bunresolved\b/g]);
  const interventions = pickMatches(text, [/\bintervention[s]?\b/g, /\brecovery\b/g, /\bescalation\b/g]);
  const stakeholders = pickMatches(text, [/\bstakeholder[s]?\b/g, /\bsponsor[s]?\b/g, /\bexecutive[s]?\b/g]);

  const next: RuntimeConversationState = {
    projectId: params.projectId,
    workspaceId: params.workspaceId,
    sessionKey: params.sessionKey,
    activeDomain: params.activeDomain ?? previous?.activeDomain ?? "operational_memory",
    recentQuestions: compact([...(previous?.recentQuestions ?? []), params.message]),
    referencedEntities: compact([...(previous?.referencedEntities ?? []), ...entities]),
    referencedBlockers: compact([...(previous?.referencedBlockers ?? []), ...blockers]),
    referencedInterventions: compact([...(previous?.referencedInterventions ?? []), ...interventions]),
    referencedStakeholders: compact([...(previous?.referencedStakeholders ?? []), ...stakeholders]),
    recentEvidence: compact([...(previous?.recentEvidence ?? []), ...params.evidenceRefs]),
    updatedAt: new Date().toISOString(),
  };
  sessionStore.set(key, next);
  return next;
}
