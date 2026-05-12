import { verifyCapabilityClaim, explainCapabilityClaim, hashCapabilityClaim, claimToAuditMetadata } from "@/lib/security/capability-claims";
import { logSecurityEvent } from "@/lib/security/telemetry";

export async function POST(request: Request) {
  const body = await request.json();
  const claim = body.capabilityClaim;
  const verification = await verifyCapabilityClaim(claim, {
    expectedAction: body.expectedAction,
    expectedWorkspaceId: body.expectedWorkspaceId,
    expectedProjectId: body.expectedProjectId,
    expectedSubject: body.expectedSubject,
    expectedResource: body.expectedResource,
    expectedPermission: body.expectedPermission,
    expectedTrustDomain: body.expectedTrustDomain,
    verifierWorkspaceId: body.verifierWorkspaceId,
    enforceVerifierPolicy: body.enforceVerifierPolicy ?? false,
  });
  const claimHash = hashCapabilityClaim(claim);
  const explanation = explainCapabilityClaim(claim);
  const trustMetadata = { ...claimToAuditMetadata(claim, verification.reason), trustDomain: verification.trustDomain ?? claim?.issuer?.trustDomain ?? null, keyId: verification.keyId ?? claim?.proof?.keyId ?? null, verifierWorkspaceId: body.verifierWorkspaceId ?? null, issuerStatus: verification.issuerStatus ?? null, keyStatus: verification.keyStatus ?? null, federationMode: verification.federationMode ?? null, reason: verification.reason };

  if (!verification.valid) {
    const ev = verification.reason === "revoked_key" ? "federated_claim_revoked_key" : verification.reason === "expired_key" ? "federated_claim_expired_key" : verification.reason.includes("untrusted") || verification.reason.includes("issuer") ? "federated_claim_untrusted_issuer" : "federated_claim_rejected";
    await logSecurityEvent(ev as any, { workspaceId: claim?.authority?.workspaceId ?? null, projectId: claim?.authority?.projectId ?? null, requested_permission: claim?.authority?.requestedPermission ?? null, metadata: trustMetadata });
  } else {
    await logSecurityEvent("capability_claim_verified" as any, { workspaceId: claim.authority.workspaceId, projectId: claim.authority.projectId ?? null, requested_permission: claim.authority.requestedPermission, metadata: trustMetadata });
    await logSecurityEvent("federated_claim_verified", { workspaceId: claim.authority.workspaceId, projectId: claim.authority.projectId ?? null, requested_permission: claim.authority.requestedPermission, metadata: trustMetadata });
  }

  return Response.json({ valid: verification.valid, reason: verification.reason, claimHash, trustResult: verification, explanation, authority: explanation.authority, lineage: explanation.lineage, constraints: explanation.constraints });
}
