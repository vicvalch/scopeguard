import { getAuthUser } from "@/lib/auth";
import { denyResponse } from "@/lib/security/deny-response";
import { createPrivilegedSupabaseClient } from "@/lib/security/privileged-access";

export async function GET(request: Request) {
  const user = await getAuthUser();
  if (!user) return denyResponse({ status: 401, routeId: "/api/governance/delegations", message: "Unauthorized", reason: "unauthorized" });
  const workspaceId = new URL(request.url).searchParams.get("workspaceId");
  if (!workspaceId) return Response.json({ error: "workspaceId required" }, { status: 400 });
  const supabase = createPrivilegedSupabaseClient({ routeId: "/api/governance/delegations", operation: "list_delegations", reason: "governance_view", systemActor: "system", workspaceId, actorUserId: user.id });
  const { data, error } = await supabase.from("governance_delegations").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(100);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ data: data ?? [] });
}
