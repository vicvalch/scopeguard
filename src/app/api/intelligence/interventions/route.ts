import { getAuthUser } from "@/lib/auth";
import { buildExecutionRiskSnapshot } from "@/lib/execution-risk";
import { buildInterventionSnapshot } from "@/lib/intervention-engine";
import { readProjectMemorySnapshot } from "@/lib/memory/organization-memory";
import { buildStakeholderRelationshipSnapshot } from "@/lib/stakeholder-intelligence";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId")?.trim() ?? "";
  const workspaceId = searchParams.get("workspaceId")?.trim() ?? "";

  const supabase = await createSupabaseServerClient();

  if (workspaceId) {
    const { data: membership } = await supabase
      .from("workspace_memberships")
      .select("workspace_id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) return Response.json({ error: "Invalid workspace context." }, { status: 403 });
  }

  let snapshot = null;

  if (projectId) {
    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!project) return Response.json({ error: "Invalid project context." }, { status: 403 });
    snapshot = await readProjectMemorySnapshot(projectId);
  }

  const intervention = buildInterventionSnapshot(projectId || null, snapshot);

  // Deterministic aggregation endpoint for intervention infra; all signals are explainable
  // and intentionally machine-readable for future autonomous intervention systems.
  return Response.json({
    projectId: projectId || null,
    workspaceId: workspaceId || null,
    generatedAt: intervention.generatedAt,
    executionRisk: buildExecutionRiskSnapshot(projectId || null, snapshot),
    stakeholderIntelligence: buildStakeholderRelationshipSnapshot(projectId || null, snapshot),
    organizationalMemory: snapshot,
    deliveryTelemetry: intervention.deliveryInstability,
    intervention,
  });
}
