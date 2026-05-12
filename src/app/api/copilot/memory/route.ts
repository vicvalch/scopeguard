import { getAuthUser } from "@/lib/auth";
import { buildContinuityContext } from "@/lib/operational-memory-v1";
import { AccessDeniedError, requireProjectAccess } from "@/lib/security/access-guards";
import { verifyAgentAttestation } from "@/lib/security/agent-attestation";
import { denyFromAccessError, denyResponse } from "@/lib/security/deny-response";

export async function GET(request: Request) {
  const user = await getAuthUser();
  if (!user) return denyResponse({ status: 401, routeId: "/api/copilot/memory", message: "Unauthorized", reason: "unauthorized" });

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId")?.trim() ?? null;
  const agentToken = request.headers.get("x-pmf-agent-token");
  const agentId = request.headers.get("x-pmf-agent-id");
  const workspaceId = request.headers.get("x-pmf-workspace-id");
  if (agentToken || agentId || workspaceId) {
    if (!agentToken || !agentId || !workspaceId) return denyResponse({ status: 403, routeId: "/api/copilot/memory", message: "Incomplete agent attestation headers.", reason: "missing_attestation_headers", actorUserId: user.id, eventType: "malformed_attestation" });
    try {
      await verifyAgentAttestation({ token: agentToken, expectedAgentId: agentId, workspaceId, permission: "read", projectId: projectId || undefined });
    } catch (error) {
      if (error instanceof AccessDeniedError) return denyFromAccessError(error, { status: 403, routeId: "/api/copilot/memory", message: "Agent attestation denied.", actorUserId: user.id, actorAgentId: agentId, workspaceId, projectId, requestedPermission: "read", deniedPermission: "read", eventType: "invalid_attestation" });
      throw error;
    }
  }

  if (projectId) {
    try {
      await requireProjectAccess(projectId);
    } catch (error) {
      if (error instanceof AccessDeniedError) {
        return denyFromAccessError(error, { status: 403, routeId: "/api/copilot/memory", message: "Invalid project context.", actorUserId: user.id, projectId, requestedPermission: "read", deniedPermission: "read", eventType: "project_scope_violation" });
      }
      throw error;
    }
  }
  const continuity = await buildContinuityContext(user.companyId, projectId);

  return Response.json({
    blockers: continuity.blockers.map((item) => `${item.memoryText} (from ${item.sourceType}:${item.sourceReference})`),
    recentDecisions: continuity.decisions.map((item) => `${item.memoryText} (from ${item.sourceType}:${item.sourceReference})`),
    stakeholderPressure: continuity.stakeholders.map((item) => `${item.memoryText} (from ${item.sourceType}:${item.sourceReference})`),
    criticalRisks: continuity.risks.map((item) => `${item.memoryText} (from ${item.sourceType}:${item.sourceReference})`),
    concerns: continuity.unresolved.map((item) => `${item.memoryText} (from ${item.sourceType}:${item.sourceReference})`).slice(0, 8),
  });
}
