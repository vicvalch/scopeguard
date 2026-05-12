import { createHmac, createHash, timingSafeEqual } from "node:crypto";

export const CAPABILITY_CLAIM_VERSION = "pmfreak-capability-claim-v1" as const;
export type ClaimIssuerType = "system" | "user" | "agent";
export type ClaimSubjectType = "user" | "agent";

export type CapabilityClaim = {
  version: typeof CAPABILITY_CLAIM_VERSION;
  issuer: { app: "pmfreak"; workspaceId: string; issuerType: ClaimIssuerType; issuerUserId?: string; issuerAgentId?: string };
  subject: { subjectType: ClaimSubjectType; userId?: string; agentId?: string };
  authority: { action: string; requestedPermission: string; resourceType?: string; resourceId?: string; workspaceId: string; projectId?: string };
  constraints: { maxUses?: number; allowedUntil: string; canDelegate?: boolean; delegationDepth?: number; allowedActions?: string[]; allowedProjectIds?: string[]; allowedResourceTypes?: string[] };
  lineage: { parentDecisionId?: string; parentGrantId?: string; parentDelegationId?: string; rootApprovalRequestId?: string; issuedAt: string };
  proof: { algorithm: "HMAC-SHA256"; keyId: string; signature: string };
};

const canonicalize = (value: unknown): string => JSON.stringify(sortValue(value));
const sortValue = (value: unknown): unknown => Array.isArray(value) ? value.map(sortValue) : value && typeof value === "object" ? Object.keys(value as Record<string, unknown>).sort().reduce((acc, key) => ({ ...acc, [key]: sortValue((value as Record<string, unknown>)[key]) }), {}) : value;

const getClaimSecret = () => {
  const secret = process.env.PMFREAK_CAPABILITY_CLAIM_SECRET;
  if (!secret) throw new Error("capability_claim_secret_missing");
  return secret;
};

const signPayload = (payload: Omit<CapabilityClaim, "proof">, keyId: string) => createHmac("sha256", getClaimSecret()).update(`${keyId}.${canonicalize(payload)}`).digest("base64url");

export function createCapabilityClaim(input: Omit<CapabilityClaim, "version" | "proof"> & { keyId: string }): CapabilityClaim {
  if (JSON.stringify(input).includes("grantToken") || JSON.stringify(input).includes("delegationToken")) throw new Error("claim_contains_raw_token");
  const payload = { ...input, version: CAPABILITY_CLAIM_VERSION };
  const signature = signPayload(payload, input.keyId);
  return { ...payload, proof: { algorithm: "HMAC-SHA256", keyId: input.keyId, signature } };
}

export function signCapabilityClaim(claim: Omit<CapabilityClaim, "proof">, keyId: string) { return { algorithm: "HMAC-SHA256" as const, keyId, signature: signPayload(claim, keyId) }; }
export function hashCapabilityClaim(claim: CapabilityClaim) { return createHash("sha256").update(canonicalize(claim)).digest("hex"); }

export function verifyClaimLineage(claim: CapabilityClaim, expected?: { parentDecisionId?: string; parentGrantId?: string; parentDelegationId?: string; rootApprovalRequestId?: string }) {
  if (!expected) return { ok: true, reason: "lineage_not_checked" };
  for (const key of ["parentDecisionId", "parentGrantId", "parentDelegationId", "rootApprovalRequestId"] as const) {
    if (expected[key] && claim.lineage[key] !== expected[key]) return { ok: false, reason: `lineage_${key}_mismatch` };
  }
  return { ok: true, reason: "lineage_verified" };
}

export function verifyCapabilityClaim(claim: CapabilityClaim, expected: any = {}) {
  if (claim.version !== CAPABILITY_CLAIM_VERSION) return { valid: false, reason: "unsupported_version" };
  if (claim.issuer.app !== "pmfreak") return { valid: false, reason: "invalid_issuer_app" };
  if (new Date(claim.constraints.allowedUntil).getTime() <= Date.now()) return { valid: false, reason: "expired" };
  const unsigned = { ...claim, proof: undefined } as unknown as Omit<CapabilityClaim, "proof">;
  const sig = signPayload(unsigned, claim.proof.keyId);
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(claim.proof.signature))) return { valid: false, reason: "signature_invalid" };
  if (expected.expectedWorkspaceId && claim.authority.workspaceId !== expected.expectedWorkspaceId) return { valid: false, reason: "workspace_mismatch" };
  if (expected.expectedProjectId && claim.authority.projectId !== expected.expectedProjectId) return { valid: false, reason: "project_mismatch" };
  if (expected.expectedAction && claim.authority.action !== expected.expectedAction) return { valid: false, reason: "action_mismatch" };
  if (expected.expectedPermission && claim.authority.requestedPermission !== expected.expectedPermission) return { valid: false, reason: "permission_mismatch" };
  if (expected.expectedSubject?.userId && claim.subject.userId !== expected.expectedSubject.userId) return { valid: false, reason: "subject_mismatch" };
  if (expected.expectedResource?.resourceId && claim.authority.resourceId !== expected.expectedResource.resourceId) return { valid: false, reason: "resource_mismatch" };
  const lineage = verifyClaimLineage(claim, expected.expectedLineage);
  if (!lineage.ok) return { valid: false, reason: lineage.reason };
  return { valid: true, reason: "verified", claimHash: hashCapabilityClaim(claim), lineage: lineage.reason };
}

export const explainCapabilityClaim = (claim: CapabilityClaim) => ({ authority: claim.authority, constraints: claim.constraints, lineage: claim.lineage, subject: claim.subject, issuer: claim.issuer });
export const claimToAuditMetadata = (claim: CapabilityClaim, reason = "") => ({ claimHash: hashCapabilityClaim(claim), keyId: claim.proof.keyId, workspaceId: claim.authority.workspaceId, projectId: claim.authority.projectId ?? null, subjectUserId: claim.subject.userId ?? null, subjectAgentId: claim.subject.agentId ?? null, action: claim.authority.action, requestedPermission: claim.authority.requestedPermission, reason });
