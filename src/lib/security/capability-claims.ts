import { createHmac, createPrivateKey, sign, timingSafeEqual, verify } from "node:crypto";
import { CAPABILITY_CLAIM_VERSION, CAPABILITY_CLAIM_VERSION_V11, CAPABILITY_CLAIM_VERSION_V12, canonicalize, claimToAuditMetadata, explainCapabilityClaim, hashCapabilityClaim, type CapabilityClaim } from "@/aoc/protocol/contracts/capability-claims";
import { evaluateVerifierPolicy, getActiveAsymmetricSigningKey, getActiveSigningKey, resolvePublicVerificationKey, resolveVerificationKey, verifyIssuerTrust } from "@/lib/security/trust-domains";
import { getRevocationReason } from "@/lib/security/trust-coordination";
import { logSecurityEvent } from "@/lib/security/telemetry";

const getClaimSecret = () => { const secret = process.env.PMFREAK_CAPABILITY_CLAIM_SECRET; if (!secret) throw new Error("capability_claim_secret_missing"); return secret; };
const signHmac = (payload: Omit<CapabilityClaim, "proof">, keyId: string) => createHmac("sha256", getClaimSecret()).update(`${keyId}.${canonicalize(payload)}`).digest("base64url");
const signEd25519 = (payload: Omit<CapabilityClaim, "proof">, keyId: string, secretRef: string) => sign(null, Buffer.from(`${keyId}.${canonicalize(payload)}`), createPrivateKey(process.env[secretRef] ?? "")).toString("base64url");

export async function createCapabilityClaim(input: Omit<CapabilityClaim, "version" | "proof"> & { keyId?: string; trustDomain?: string }) {
  if (JSON.stringify(input).includes("grantToken") || JSON.stringify(input).includes("delegationToken")) throw new Error("claim_contains_raw_token");
  const trustDomain = input.trustDomain ?? input.issuer.trustDomain ?? "pmfreak-local";
  const issuedAt = new Date().toISOString();
  const payload = { ...input, version: CAPABILITY_CLAIM_VERSION_V12, issuer: { ...input.issuer, trustDomain, issuerId: input.issuer.issuerId ?? `${input.issuer.app}:${input.issuer.workspaceId}` }, lineage: { ...input.lineage, issuedAt } } as Omit<CapabilityClaim, "proof">;
  const key = input.keyId ? { key_id: input.keyId, algorithm: "HMAC-SHA256" } : await getActiveAsymmetricSigningKey(trustDomain) ?? await getActiveSigningKey(trustDomain);
  if (!key?.key_id) throw new Error("missing_active_signing_key");
  const signature = key.algorithm === "Ed25519" ? (() => { if (!key.secret_ref || !process.env[key.secret_ref]) throw new Error("asymmetric_private_key_unavailable"); return signEd25519(payload, key.key_id, key.secret_ref); })() : signHmac(payload, key.key_id);
  if (key.algorithm === "Ed25519") await logSecurityEvent("asymmetric_claim_issued", { workspaceId: payload.authority.workspaceId, metadata: { trustDomain, keyId: key.key_id, algorithm: key.algorithm } });
  return { ...payload, proof: { algorithm: key.algorithm === "Ed25519" ? "Ed25519" : "HMAC-SHA256", keyId: key.key_id, trustDomain, issuedAt, signature } } as CapabilityClaim;
}

export async function verifyCapabilityClaim(claim: CapabilityClaim, expected: any = {}) {
  const claimHash = hashCapabilityClaim(claim);
  if (![
    CAPABILITY_CLAIM_VERSION,
    CAPABILITY_CLAIM_VERSION_V11,
    CAPABILITY_CLAIM_VERSION_V12,
    "pmfreak-capability-claim-v1",
    "pmfreak-capability-claim-v1.1",
    "pmfreak-capability-claim-v1.2",
  ].includes(claim.version)) return { valid: false, reason: "unsupported_version", claimHash };
  const trustDomain = claim.proof.trustDomain ?? claim.issuer.trustDomain ?? "pmfreak-local";
  const trust = await verifyIssuerTrust({ trustDomain, issuerApp: claim.issuer.app, expectedTrustDomain: expected.expectedTrustDomain }); if (!trust.ok) return { valid: false, reason: trust.reason, claimHash, trustDomain };
  const key = await resolveVerificationKey({ trustDomainId: trust.trustDomain.id, keyId: claim.proof.keyId }); if (!key) return { valid: false, reason: "unknown_key", claimHash, trustDomain };
  const revocationReason = await getRevocationReason({ trustDomain, keyId: claim.proof.keyId, claimHash, delegationId: claim.lineage.parentDelegationId, grantId: claim.lineage.parentGrantId });
  if (revocationReason) return { valid: false, reason: revocationReason, claimHash, trustDomain, keyId: key.key_id };
  if (!["HMAC-SHA256", "Ed25519"].includes(claim.proof.algorithm)) return { valid: false, reason: "unsupported_algorithm", claimHash, trustDomain, keyId: key.key_id };
  if (key.algorithm !== claim.proof.algorithm || key.status === "revoked") return { valid: false, reason: key.status === "revoked" ? "revoked_key" : "unsupported_algorithm", claimHash, trustDomain, keyId: key.key_id };
  const unsigned = { ...claim, proof: undefined } as unknown as Omit<CapabilityClaim, "proof">;
  const ok = claim.proof.algorithm === "Ed25519" ? (() => { const k = resolvePublicVerificationKey(key); if (!k) return false; return verify(null, Buffer.from(`${claim.proof.keyId}.${canonicalize(unsigned)}`), k, Buffer.from(claim.proof.signature, "base64url")); })() : timingSafeEqual(Buffer.from(signHmac(unsigned, claim.proof.keyId)), Buffer.from(claim.proof.signature));
  if (!ok) return { valid: false, reason: "signature_invalid", claimHash, trustDomain, keyId: key.key_id };
  if (expected.enforceVerifierPolicy && expected.verifierWorkspaceId) { const pol = await evaluateVerifierPolicy({ verifierWorkspaceId: expected.verifierWorkspaceId, trustDomainId: trust.trustDomain.id, issuerApp: claim.issuer.app, action: claim.authority.action, resourceType: claim.authority.resourceType }); if (!pol.ok) return { valid: false, reason: "issuer_policy_denied", claimHash, trustDomain, keyId: key.key_id }; }
  return { valid: true, reason: "verified", claimHash, trustDomain, keyId: key.key_id, algorithm: claim.proof.algorithm, independentlyVerifiable: claim.proof.algorithm === "Ed25519", verificationMode: claim.proof.algorithm === "Ed25519" ? "independent_public_key" : "server_mediated" };
}

export {
  CAPABILITY_CLAIM_VERSION,
  CAPABILITY_CLAIM_VERSION_V11,
  CAPABILITY_CLAIM_VERSION_V12,
  claimToAuditMetadata,
  explainCapabilityClaim,
  hashCapabilityClaim,
};
export type { CapabilityClaim };
