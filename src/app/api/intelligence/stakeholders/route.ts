import { getAuthUser } from "@/lib/auth";
import { readProjectMemorySnapshot } from "@/lib/memory/organization-memory";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildStakeholderRelationshipSnapshot } from "@/lib/stakeholder-intelligence";

export async function GET(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

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

    if (!membership) {
      return Response.json({ error: "Invalid workspace context." }, { status: 403 });
    }
  }

  if (!projectId) {
    return Response.json(buildStakeholderRelationshipSnapshot(null, null));
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!project) {
    return Response.json({ error: "Invalid project context." }, { status: 403 });
  }

  const snapshot = await readProjectMemorySnapshot(projectId);
  return Response.json(buildStakeholderRelationshipSnapshot(projectId, snapshot));
}
