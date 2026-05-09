import { getAuthUser } from "@/lib/auth";
import { buildExecutionRiskSnapshot } from "@/lib/execution-risk";
import { readProjectMemorySnapshot } from "@/lib/memory/organization-memory";

export async function GET(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId")?.trim() ?? "";

  // Operational scope resolution stays deterministic so future PMO-level agents
  // can reuse the same snapshot shape across project, workspace, and portfolio views.
  const snapshot = projectId.length > 0 ? await readProjectMemorySnapshot(projectId) : null;

  if (projectId.length > 0 && !snapshot) {
    return Response.json({ error: "Invalid project context." }, { status: 403 });
  }

  const riskSnapshot = buildExecutionRiskSnapshot(projectId || null, snapshot);
  return Response.json(riskSnapshot);
}
