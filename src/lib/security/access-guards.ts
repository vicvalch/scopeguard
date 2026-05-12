import { getAuthUser, type AuthUserContext } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logSecurityEvent } from "@/lib/security/telemetry";
import { defaultGovernancePolicyEvaluator, type Permission, type WorkspaceRole } from "@/lib/security/rbac";

export class AccessDeniedError extends Error {
  constructor(message: string, public readonly metadata: Record<string, unknown> = {}) {
    super(message);
    this.name = "AccessDeniedError";
  }
}

export async function requireWorkspaceMembership(workspaceId: string): Promise<{ user: AuthUserContext; workspaceId: string; role: WorkspaceRole }> {
  const user = await getAuthUser();
  if (!user) {
    void logSecurityEvent("auth_denied", { workspaceId, routeId: "requireWorkspaceMembership", metadata: { reason: "unauthorized" } });
    throw new AccessDeniedError("Unauthorized workspace access.", { workspaceId, reason: "unauthorized" });
  }
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("workspace_memberships").select("workspace_id, role").eq("workspace_id", workspaceId).eq("user_id", user.id).maybeSingle();
  if (!data) {
    void logSecurityEvent("revoked_membership_attempt", { actorUserId: user.id, workspaceId, routeId: "requireWorkspaceMembership" });
    throw new AccessDeniedError("Workspace membership required.", { userId: user.id, workspaceId, reason: "membership_missing" });
  }
  return { user, workspaceId, role: data.role as WorkspaceRole };
}

export async function requireProjectPermission(projectId: string, permission: Permission): Promise<{ user: AuthUserContext; projectId: string; workspaceId: string; role: WorkspaceRole }> {
  const user = await getAuthUser();
  if (!user) {
    void logSecurityEvent("auth_denied", { projectId, routeId: "requireProjectPermission", requested_permission: permission, metadata: { reason: "unauthorized" } });
    throw new AccessDeniedError("Unauthorized project access.", { projectId, reason: "unauthorized" });
  }
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("projects")
    .select("id, workspace_id, workspace_memberships!inner(user_id, role)")
    .eq("id", projectId)
    .eq("workspace_memberships.user_id", user.id)
    .maybeSingle();

  if (!data) {
    void logSecurityEvent("project_scope_violation", { actorUserId: user.id, projectId, routeId: "requireProjectPermission", requested_permission: permission });
    throw new AccessDeniedError("Project access denied.", { userId: user.id, projectId, reason: "membership_chain_denied" });
  }

  const role = (data.workspace_memberships as unknown as { role: WorkspaceRole }[])[0]?.role;
  const policy = defaultGovernancePolicyEvaluator({ workspaceRole: role, requestedPermission: permission, projectId, actorType: "user" });
  if (!policy.allowed) {
    void logSecurityEvent("denied_permission", { actorUserId: user.id, projectId, actorRole: role, requested_permission: permission, denied_permission: permission, routeId: "requireProjectPermission" });
    throw new AccessDeniedError("Project permission denied.", { reason: policy.reason, permission, projectId });
  }

  return { user, projectId, workspaceId: data.workspace_id, role };
}

export async function requireWorkspaceRole(workspaceId: string, allowedRoles: WorkspaceRole[]) {
  const ctx = await requireWorkspaceMembership(workspaceId);
  if (!allowedRoles.includes(ctx.role)) {
    void logSecurityEvent("workspace_scope_violation", { actorUserId: ctx.user.id, workspaceId, actorRole: ctx.role, routeId: "requireWorkspaceRole", metadata: { allowedRoles } });
    throw new AccessDeniedError("Workspace role denied.", { userId: ctx.user.id, workspaceId, role: ctx.role });
  }
  return ctx;
}

export async function requireGovernancePermission(workspaceId: string, permission: Permission) {
  const ctx = await requireWorkspaceMembership(workspaceId);
  const policy = defaultGovernancePolicyEvaluator({ workspaceRole: ctx.role, requestedPermission: permission, actorType: "user" });
  if (!policy.allowed) {
    void logSecurityEvent("governance_violation", { actorUserId: ctx.user.id, workspaceId, actorRole: ctx.role, requested_permission: permission, denied_permission: permission, routeId: "requireGovernancePermission" });
    throw new AccessDeniedError("Governance policy denied.", { workspaceId, permission, reason: policy.reason });
  }
  return ctx;
}

export async function requireAgentScope(input: { workspaceId: string; agentId: string; permission: Permission; projectId?: string }) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("ai_agent_permissions")
    .select("agent_id, workspace_id, project_id, permissions, revoked_at")
    .eq("workspace_id", input.workspaceId)
    .eq("agent_id", input.agentId)
    .is("revoked_at", null);

  const grants = data ?? [];
  const scopedGrant = grants.find((grant) => (!input.projectId || grant.project_id === input.projectId) && Array.isArray(grant.permissions) && grant.permissions.includes(input.permission));

  if (!scopedGrant) {
    void logSecurityEvent("revoked_agent_access", {
      workspaceId: input.workspaceId,
      actorAgentId: input.agentId,
      requested_permission: input.permission,
      denied_permission: input.permission,
      projectId: input.projectId,
      routeId: "requireAgentScope",
    });
    throw new AccessDeniedError("AI agent scope denied.", { ...input, reason: "agent_scope_denied" });
  }

  return { workspaceId: input.workspaceId, aiAgentId: input.agentId, permission: input.permission, projectId: input.projectId };
}

export async function requireProjectAccess(projectId: string) {
  return requireProjectPermission(projectId, "read");
}

export async function requireScopedResourceAccess(input: { workspaceId?: string; projectId?: string }) {
  if (input.projectId) return requireProjectAccess(input.projectId);
  if (input.workspaceId) return requireWorkspaceMembership(input.workspaceId);
  throw new AccessDeniedError("Scoped access requires workspaceId or projectId.", { reason: "scope_missing" });
}
