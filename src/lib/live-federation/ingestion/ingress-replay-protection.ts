const REPLAY_WINDOW_MS = 10 * 60 * 1000;

type ReplayEntry = {
  workspaceId: string;
  connectorId: string;
  nonce: string;
  payloadHash: string;
  observedAt: number;
};

const replayLedger = new Map<string, ReplayEntry>();

export type IngressReplayValidation = {
  accepted: boolean;
  reason?: string;
  replayKey: string;
};

function buildReplayKey(workspaceId: string, connectorId: string, nonce: string): string {
  return `${workspaceId}:${connectorId}:${nonce}`;
}

export function validateIngressReplay(workspaceId: string, connectorId: string, nonce: string, payloadHash: string): IngressReplayValidation {
  const replayKey = buildReplayKey(workspaceId, connectorId, nonce);
  const now = Date.now();
  const existing = replayLedger.get(replayKey);
  if (!existing) {
    return { accepted: true, replayKey };
  }
  if (now - existing.observedAt > REPLAY_WINDOW_MS) {
    replayLedger.delete(replayKey);
    return { accepted: true, replayKey };
  }
  if (existing.payloadHash !== payloadHash) {
    return rejectReplayIngress(replayKey, "connector spoof replay detected");
  }
  return rejectReplayIngress(replayKey, "duplicate webhook replay blocked");
}

export function registerIngressNonce(workspaceId: string, connectorId: string, nonce: string, payloadHash: string): void {
  replayLedger.set(buildReplayKey(workspaceId, connectorId, nonce), {
    workspaceId,
    connectorId,
    nonce,
    payloadHash,
    observedAt: Date.now(),
  });
}

export function rejectReplayIngress(replayKey: string, reason: string): IngressReplayValidation {
  return { accepted: false, reason, replayKey };
}
