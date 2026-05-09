import { getAuthUser } from "@/lib/auth";
import { buildOperationalCoordinationSnapshot } from "@/lib/coordination-orchestrator";
import { buildExecutionRiskSnapshot } from "@/lib/execution-risk";
import { buildInterventionSnapshot } from "@/lib/intervention-engine";
import { readProjectMemorySnapshot } from "@/lib/memory/organization-memory";
import { buildStakeholderRelationshipSnapshot } from "@/lib/stakeholder-intelligence";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const daysSince = (dateValue: string | null): number => {
  if (!dateValue) return 30;
  const parsed = Date.parse(dateValue);
  if (Number.isNaN(parsed)) return 30;
  return Math.max(0, Math.floor((Date.now() - parsed) / 86_400_000));
};

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

  const executionRisk = buildExecutionRiskSnapshot(projectId || null, snapshot);
  const stakeholderIntelligence = buildStakeholderRelationshipSnapshot(projectId || null, snapshot);
  const interventionIntelligence = buildInterventionSnapshot(projectId || null, snapshot);

  const coordination = buildOperationalCoordinationSnapshot({
    projectId: projectId || null,
    workspaceId: workspaceId || null,
    executionRisk,
    stakeholderIntelligence,
    interventionIntelligence,
    organizationalMemory: snapshot,
    timelineIntelligence: { daysSinceUpdate: daysSince(snapshot?.lastUpdatedAt ?? null), stale: daysSince(snapshot?.lastUpdatedAt ?? null) >= 7 },
  });

  return Response.json({
    projectId: projectId || null,
    workspaceId: workspaceId || null,
    generatedAt: coordination.generatedAt,
    executionRisk,
    stakeholderIntelligence,
    interventionIntelligence,
    organizationalMemory: snapshot,
    timelineIntelligence: coordination.commentary.find((item) => item.includes("Timeline intelligence")) ?? "Timeline signal not available.",
    coordination,
  });
}
