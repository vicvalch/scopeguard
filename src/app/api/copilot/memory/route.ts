import { getAuthUser } from "@/lib/auth";
import { buildContinuityContext } from "@/lib/operational-memory-v1";
import { AccessDeniedError, requireProjectAccess } from "@/lib/security/access-guards";
import { verifyAgentAttestation } from "@/lib/security/agent-attestation";

export async function GET(request: Request) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId")?.trim() ?? null;
  const agentToken = request.headers.get("x-pmf-agent-token");
  const agentId = request.headers.get("x-pmf-agent-id");
  const workspaceId = request.headers.get("x-pmf-workspace-id");
  if (agentToken || agentId || workspaceId) {
    if (!agentToken || !agentId || !workspaceId) return Response.json({ error: "Incomplete agent attestation headers." }, { status: 400 });
    try {
      await verifyAgentAttestation({ token: agentToken, expectedAgentId: agentId, workspaceId, permission: "read", projectId: projectId || undefined });
    } catch (error) {
      if (error instanceof AccessDeniedError) return Response.json({ error: "Agent attestation denied." }, { status: 403 });
      throw error;
    }
  }

  if (projectId) {
    try {
      await requireProjectAccess(projectId);
    } catch (error) {
      if (error instanceof AccessDeniedError) {
        console.warn("[security] copilot_memory_access_denied", error.metadata);
        return Response.json({ error: "Invalid project context." }, { status: 403 });
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
