import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import { evaluateVerifierPolicy, getActiveSigningKey, resolveVerificationKey, verifyIssuerTrust } from "@/lib/security/trust-domains";

export const CAPABILITY_CLAIM_VERSION = "pmfreak-capability-claim-v1" as const;
export const CAPABILITY_CLAIM_VERSION_V11 = "pmfreak-capability-claim-v1.1" as const;
export type CapabilityClaimVersion = typeof CAPABILITY_CLAIM_VERSION | typeof CAPABILITY_CLAIM_VERSION_V11;
export type ClaimIssuerType = "system" | "user" | "agent";
export type ClaimSubjectType = "user" | "agent";

export type CapabilityClaim = {
  version: CapabilityClaimVersion;
  issuer: { app: "pmfreak"; workspaceId: string; issuerType: ClaimIssuerType; issuerUserId?: string; issuerAgentId?: string; trustDomain?: string; issuerId?: string };
  subject: { subjectType: ClaimSubjectType; userId?: string; agentId?: string };
  authority: { action: string; requestedPermission: string; resourceType?: string; resourceId?: string; workspaceId: string; projectId?: string };
  constraints: { maxUses?: number; allowedUntil: string; canDelegate?: boolean; delegationDepth?: number; allowedActions?: string[]; allowedProjectIds?: string[]; allowedResourceTypes?: string[] };
  lineage: { parentDecisionId?: string; parentGrantId?: string; parentDelegationId?: string; rootApprovalRequestId?: string; issuedAt: string };
  proof: { algorithm: "HMAC-SHA256"; keyId: string; signature: string; trustDomain?: string; issuedAt?: string };
};
type VerificationExpected = {
  expectedAction?: string;
  expectedWorkspaceId?: string;
  expectedProjectId?: string;
  expectedSubject?: { userId?: string };
  expectedResource?: { resourceId?: string };
  expectedPermission?: string;
  expectedTrustDomain?: string;
  verifierWorkspaceId?: string;
  enforceVerifierPolicy?: boolean;
};
const canonicalize = (value: unknown): string => JSON.stringify(sortValue(value));
const sortValue = (value: unknown): unknown => Array.isArray(value) ? value.map(sortValue) : value && typeof value === "object" ? Object.keys(value as Record<string, unknown>).sort().reduce((acc, key) => ({ ...acc, [key]: sortValue((value as Record<string, unknown>)[key]) }), {}) : value;
const getClaimSecret = () => { const secret = process.env.PMFREAK_CAPABILITY_CLAIM_SECRET; if (!secret) throw new Error("capability_claim_secret_missing"); return secret; };
const signPayload = (payload: Omit<CapabilityClaim, "proof">, keyId: string) => createHmac("sha256", getClaimSecret()).update(`${keyId}.${canonicalize(payload)}`).digest("base64url");

export async function createCapabilityClaim(input: Omit<CapabilityClaim, "version" | "proof"> & { keyId?: string; trustDomain?: string }) {
  if (JSON.stringify(input).includes("grantToken") || JSON.stringify(input).includes("delegationToken")) throw new Error("claim_contains_raw_token");
  const trustDomain = input.trustDomain ?? input.issuer.trustDomain ?? "pmfreak-local";
  const key = input.keyId ? { key_id: input.keyId } : await getActiveSigningKey(trustDomain);
  if (!key?.key_id) throw new Error("missing_active_signing_key");
  const issuedAt = new Date().toISOString();
  const payload = { ...input, version: CAPABILITY_CLAIM_VERSION_V11, issuer: { ...input.issuer, trustDomain, issuerId: input.issuer.issuerId ?? `${input.issuer.app}:${input.issuer.workspaceId}` }, lineage: { ...input.lineage, issuedAt } } as Omit<CapabilityClaim, "proof">;
  const signature = signPayload(payload, key.key_id);
  return { ...payload, proof: { algorithm: "HMAC-SHA256", keyId: key.key_id, trustDomain, issuedAt, signature } } as CapabilityClaim;
}

export function hashCapabilityClaim(claim: CapabilityClaim) { return createHash("sha256").update(canonicalize(claim)).digest("hex"); }
export function verifyClaimLineage(claim: CapabilityClaim, expected?: { parentDecisionId?: string; parentGrantId?: string; parentDelegationId?: string; rootApprovalRequestId?: string }) { if (!expected) return { ok: true, reason: "lineage_not_checked" }; for (const key of ["parentDecisionId", "parentGrantId", "parentDelegationId", "rootApprovalRequestId"] as const) if (expected[key] && claim.lineage[key] !== expected[key]) return { ok: false, reason: `lineage_${key}_mismatch` }; return { ok: true, reason: "lineage_verified" }; }

export async function verifyCapabilityClaim(claim: CapabilityClaim, expected: VerificationExpected = {}) {
  const claimHash = hashCapabilityClaim(claim);
  if (![CAPABILITY_CLAIM_VERSION, CAPABILITY_CLAIM_VERSION_V11].includes(claim.version)) return { valid: false, reason: "unsupported_version", claimHash };
  if (claim.issuer.app !== "pmfreak") return { valid: false, reason: "invalid_issuer_app", claimHash };
  if (expected.expectedWorkspaceId && claim.authority.workspaceId !== expected.expectedWorkspaceId) return { valid: false, reason: "workspace_mismatch", claimHash };
  if (expected.expectedProjectId && claim.authority.projectId !== expected.expectedProjectId) return { valid: false, reason: "project_mismatch", claimHash };
  if (expected.expectedAction && claim.authority.action !== expected.expectedAction) return { valid: false, reason: "action_mismatch", claimHash };
  if (expected.expectedPermission && claim.authority.requestedPermission !== expected.expectedPermission) return { valid: false, reason: "permission_mismatch", claimHash };
  if (expected.expectedSubject?.userId && claim.subject.userId !== expected.expectedSubject.userId) return { valid: false, reason: "subject_mismatch", claimHash };
  if (expected.expectedResource?.resourceId && claim.authority.resourceId !== expected.expectedResource.resourceId) return { valid: false, reason: "resource_mismatch", claimHash };
  const trustDomain = claim.proof.trustDomain ?? claim.issuer.trustDomain ?? "pmfreak-local";
  const trust = await verifyIssuerTrust({ trustDomain, issuerApp: claim.issuer.app, expectedTrustDomain: expected.expectedTrustDomain });
  if (!trust.ok) return { valid: false, reason: trust.reason, claimHash, trustDomain, issuerStatus: trust.trustDomain?.status ?? null, federationMode: trust.federationMode ?? null, explanation: "issuer trust-domain check failed", warnings: [] };
  const key = await resolveVerificationKey({ trustDomainId: trust.trustDomain.id, keyId: claim.proof.keyId });
  if (!key) return { valid: false, reason: "unknown_key", claimHash, trustDomain, keyId: claim.proof.keyId, issuerStatus: trust.trustDomain.status, keyStatus: null, federationMode: trust.federationMode, explanation: "signing key not found", warnings: [] };
  if (key.algorithm !== claim.proof.algorithm) return { valid: false, reason: "unsupported_algorithm", claimHash, trustDomain, keyId: key.key_id, issuerStatus: trust.trustDomain.status, keyStatus: key.status, federationMode: trust.federationMode, explanation: "algorithm mismatch", warnings: [] };
  if (key.status === "revoked") return { valid: false, reason: "revoked_key", claimHash, trustDomain, keyId: key.key_id, issuerStatus: trust.trustDomain.status, keyStatus: key.status, federationMode: trust.federationMode, explanation: "key revoked", warnings: [] };
  const issuedAt = new Date(claim.proof.issuedAt ?? claim.lineage.issuedAt).getTime();
  if (issuedAt < new Date(key.valid_from).getTime() || (key.valid_until && issuedAt > new Date(key.valid_until).getTime())) return { valid: false, reason: "expired_key", claimHash, trustDomain, keyId: key.key_id, issuerStatus: trust.trustDomain.status, keyStatus: key.status, federationMode: trust.federationMode, explanation: "claim issued outside key validity window", warnings: [] };
  if (new Date(claim.constraints.allowedUntil).getTime() <= Date.now()) return { valid: false, reason: "expired", claimHash, trustDomain, keyId: key.key_id, issuerStatus: trust.trustDomain.status, keyStatus: key.status, federationMode: trust.federationMode, explanation: "claim expiration reached", warnings: [] };
  const unsigned = { ...claim, proof: undefined } as unknown as Omit<CapabilityClaim, "proof">;
  const sig = signPayload(unsigned, claim.proof.keyId);
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(claim.proof.signature))) return { valid: false, reason: "signature_invalid", claimHash, trustDomain, keyId: key.key_id, issuerStatus: trust.trustDomain.status, keyStatus: key.status, federationMode: trust.federationMode, explanation: "signature mismatch", warnings: [] };
  if (expected.enforceVerifierPolicy && expected.verifierWorkspaceId) { const pol = await evaluateVerifierPolicy({ verifierWorkspaceId: expected.verifierWorkspaceId, trustDomainId: trust.trustDomain.id, issuerApp: claim.issuer.app, action: claim.authority.action, resourceType: claim.authority.resourceType }); if (!pol.ok) return { valid: false, reason: "issuer_policy_denied", claimHash, trustDomain, keyId: key.key_id, issuerStatus: trust.trustDomain.status, keyStatus: key.status, federationMode: trust.federationMode, explanation: "verifier policy denied issuer", warnings: [] }; }
  return { valid: true, reason: "verified", claimHash, trustDomain, keyId: key.key_id, issuerStatus: trust.trustDomain.status, keyStatus: key.status, federationMode: trust.federationMode, explanation: "verified with trust-domain aware checks", warnings: key.status === "rotated" ? ["rotated_key_historical_verification"] : [] };
}

export const explainCapabilityClaim = (claim: CapabilityClaim) => ({ authority: claim.authority, constraints: claim.constraints, lineage: claim.lineage, subject: claim.subject, issuer: claim.issuer, proof: claim.proof });
export const claimToAuditMetadata = (claim: CapabilityClaim, reason = "") => ({ claimHash: hashCapabilityClaim(claim), keyId: claim.proof.keyId, trustDomain: claim.proof.trustDomain ?? claim.issuer.trustDomain ?? "pmfreak-local", workspaceId: claim.authority.workspaceId, projectId: claim.authority.projectId ?? null, subjectUserId: claim.subject.userId ?? null, subjectAgentId: claim.subject.agentId ?? null, action: claim.authority.action, requestedPermission: claim.authority.requestedPermission, issuerApp: claim.issuer.app, reason });
