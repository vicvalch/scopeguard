import { createHash } from "node:crypto";

export const CAPABILITY_CLAIM_VERSION = "pmfreak-capability-claim-v1" as const;
export const CAPABILITY_CLAIM_VERSION_V11 = "pmfreak-capability-claim-v1.1" as const;
export const CAPABILITY_CLAIM_VERSION_V12 = "pmfreak-capability-claim-v1.2" as const;
export type CapabilityClaimVersion = typeof CAPABILITY_CLAIM_VERSION | typeof CAPABILITY_CLAIM_VERSION_V11 | typeof CAPABILITY_CLAIM_VERSION_V12;
export type ClaimIssuerType = "system" | "user" | "agent";
export type ClaimSubjectType = "user" | "agent";

export type CapabilityClaim = { version: CapabilityClaimVersion; issuer: { app: "pmfreak"; workspaceId: string; issuerType: ClaimIssuerType; issuerUserId?: string; issuerAgentId?: string; trustDomain?: string; issuerId?: string }; subject: { subjectType: ClaimSubjectType; userId?: string; agentId?: string }; authority: { action: string; requestedPermission: string; resourceType?: string; resourceId?: string; workspaceId: string; projectId?: string }; constraints: { maxUses?: number; allowedUntil: string; canDelegate?: boolean; delegationDepth?: number; allowedActions?: string[]; allowedProjectIds?: string[]; allowedResourceTypes?: string[] }; lineage: { parentDecisionId?: string; parentGrantId?: string; parentDelegationId?: string; rootApprovalRequestId?: string; issuedAt: string }; proof: { algorithm: "HMAC-SHA256" | "Ed25519"; keyId: string; signature: string; trustDomain?: string; issuedAt?: string } };

export const canonicalize = (value: unknown): string => JSON.stringify(sortValue(value));
export const sortValue = (value: unknown): unknown => Array.isArray(value) ? value.map(sortValue) : value && typeof value === "object" ? Object.keys(value as Record<string, unknown>).sort().reduce((acc, key) => ({ ...acc, [key]: sortValue((value as Record<string, unknown>)[key]) }), {}) : value;

export function hashCapabilityClaim(claim: CapabilityClaim) { return createHash("sha256").update(canonicalize(claim)).digest("hex"); }

export const explainCapabilityClaim = (claim: CapabilityClaim) => ({ authority: claim.authority, constraints: claim.constraints, lineage: claim.lineage, subject: claim.subject, issuer: claim.issuer, proof: claim.proof });
export const claimToAuditMetadata = (claim: CapabilityClaim, reason = "") => ({ claimHash: hashCapabilityClaim(claim), keyId: claim.proof.keyId, trustDomain: claim.proof.trustDomain ?? claim.issuer.trustDomain ?? "pmfreak-local", workspaceId: claim.authority.workspaceId, projectId: claim.authority.projectId ?? null, subjectUserId: claim.subject.userId ?? null, subjectAgentId: claim.subject.agentId ?? null, action: claim.authority.action, requestedPermission: claim.authority.requestedPermission, issuerApp: claim.issuer.app, reason });
