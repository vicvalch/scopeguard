import { getAuthUser, type AuthUserContext } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logSecurityEvent } from "@/lib/security/telemetry";

export class AccessDeniedError extends Error {
  constructor(message: string, public readonly metadata: Record<string, unknown> = {}) {
    super(message);
    this.name = "AccessDeniedError";
  }
}


export async function requireWorkspaceMembership(workspaceId: string): Promise<{ user: AuthUserContext; workspaceId: string; role: string }> {
  const user = await getAuthUser();
  if (!user) {
    logSecurityEvent("auth_denied", { workspaceId, reason: "unauthorized" });
    throw new AccessDeniedError("Unauthorized workspace access.", { workspaceId, reason: "unauthorized" });
  }
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("workspace_memberships").select("workspace_id, role").eq("workspace_id", workspaceId).eq("user_id", user.id).maybeSingle();
  if (!data) {
    logSecurityEvent("revoked_membership_attempt", { userId: user.id, workspaceId, routeId: "requireWorkspaceMembership" });
    throw new AccessDeniedError("Workspace membership required.", { userId: user.id, workspaceId, reason: "membership_missing" });
  }
  return { user, workspaceId, role: data.role };
}

export async function requireProjectAccess(projectId: string): Promise<{ user: AuthUserContext; projectId: string; workspaceId: string }> {
  const user = await getAuthUser();
  if (!user) {
    logSecurityEvent("auth_denied", { projectId, reason: "unauthorized" });
    throw new AccessDeniedError("Unauthorized project access.", { projectId, reason: "unauthorized" });
  }
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("projects")
    .select("id, workspace_id, workspace_memberships!inner(user_id)")
    .eq("id", projectId)
    .eq("workspace_memberships.user_id", user.id)
    .maybeSingle();

  if (!data) {
    logSecurityEvent("project_scope_violation", { userId: user.id, projectId, routeId: "requireProjectAccess" });
    throw new AccessDeniedError("Project access denied.", { userId: user.id, projectId, reason: "membership_chain_denied" });
  }

  return { user, projectId, workspaceId: data.workspace_id };
}

export async function requireWorkspaceRole(workspaceId: string, allowedRoles: string[]) {
  const ctx = await requireWorkspaceMembership(workspaceId);
  if (!allowedRoles.includes(ctx.role)) {
    logSecurityEvent("workspace_scope_violation", { userId: ctx.user.id, workspaceId, role: ctx.role, allowedRoles });
    throw new AccessDeniedError("Workspace role denied.", { userId: ctx.user.id, workspaceId, role: ctx.role });
  }
  return ctx;
}

export async function requireScopedResourceAccess(input: { workspaceId?: string; projectId?: string }) {
  if (input.projectId) return requireProjectAccess(input.projectId);
  if (input.workspaceId) return requireWorkspaceMembership(input.workspaceId);
  throw new AccessDeniedError("Scoped access requires workspaceId or projectId.", { reason: "scope_missing" });
}
