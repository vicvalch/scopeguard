import { verifyCapabilityClaim, explainCapabilityClaim, hashCapabilityClaim, claimToAuditMetadata } from "@/lib/security/capability-claims";
import { logSecurityEvent } from "@/lib/security/telemetry";

export async function POST(request: Request) {
  const body = await request.json();
  const claim = body.capabilityClaim;
  const verification = verifyCapabilityClaim(claim, {
    expectedAction: body.expectedAction,
    expectedWorkspaceId: body.expectedWorkspaceId,
    expectedProjectId: body.expectedProjectId,
    expectedSubject: body.expectedSubject,
    expectedResource: body.expectedResource,
    expectedPermission: body.expectedPermission,
  });
  const claimHash = hashCapabilityClaim(claim);
  const explanation = explainCapabilityClaim(claim);
  if (!verification.valid) {
    const ev = verification.reason === "expired" ? "capability_claim_expired" : verification.reason.includes("signature") ? "capability_claim_signature_invalid" : verification.reason.includes("lineage") ? "capability_claim_lineage_invalid" : verification.reason.includes("mismatch") ? "capability_claim_scope_mismatch" : "capability_claim_invalid";
    await logSecurityEvent(ev as any, { workspaceId: claim?.authority?.workspaceId ?? null, projectId: claim?.authority?.projectId ?? null, requested_permission: claim?.authority?.requestedPermission ?? null, metadata: { ...claimToAuditMetadata(claim, verification.reason) } });
  } else {
    await logSecurityEvent("capability_claim_verified", { workspaceId: claim.authority.workspaceId, projectId: claim.authority.projectId ?? null, requested_permission: claim.authority.requestedPermission, metadata: { ...claimToAuditMetadata(claim, "verified") } });
  }
  return Response.json({ valid: verification.valid, reason: verification.reason, claimHash, explanation, authority: explanation.authority, lineage: explanation.lineage, constraints: explanation.constraints });
}
