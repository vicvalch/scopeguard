import { getAuthUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AccessDeniedError, requireProjectPermission } from "@/lib/security/access-guards";
import { denyFromAccessError, denyResponse } from "@/lib/security/deny-response";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const user = await getAuthUser();
  if (!user) {
    return denyResponse({ status: 401, routeId: "/api/projects/[id]", message: "Unauthorized", reason: "unauthorized" });
  }

  const { id } = await params;
  const projectId = id.trim();

  if (!projectId) {
    return Response.json({ error: "projectId is required." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  try {
    await requireProjectPermission(projectId, "read");
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return denyFromAccessError(error, { status: 403, routeId: "/api/projects/[id]", message: "Invalid project context.", actorUserId: user.id, projectId, requestedPermission: "read", deniedPermission: "read", eventType: "project_scope_violation" });
    }
    throw error;
  }

  const { data: project } = await supabase.from("projects").select("id, name").eq("id", projectId).maybeSingle();

  if (!project) {
    return denyResponse({ status: 403, routeId: "/api/projects/[id]", message: "Invalid project context.", reason: "project_not_found_or_out_of_scope", actorUserId: user.id, projectId, requestedPermission: "read", deniedPermission: "read", eventType: "project_scope_violation" });
  }

  return Response.json(project);
}
