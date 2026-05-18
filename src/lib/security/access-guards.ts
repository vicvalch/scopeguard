import { getAuthUser, type AuthUserContext } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logSecurityEvent } from "@/lib/security/telemetry";
import { type Permission, type WorkspaceRole } from "@/lib/security/rbac";
import { authorizeRuntimeAction } from "@/lib/aoc/enterprise/authorization";
import { buildEnterpriseRuntimeRequest } from "@/lib/aoc/pmfreak-runtime-consumer";
import type { GovernanceAction } from "@aoc-enterprise/runtime";

export class AccessDeniedError extends Error {
  constructor(message: string, public readonly metadata: Record<string, unknown> = {}) {
    super(message);
    this.name = "AccessDeniedError";
  }
}

const GOVERNANCE_ACTION_BY_PERMISSION: Record<Permission, GovernanceAction> = {
  read: "project.read",
  write: "project.write",
  delete: "project.write",
  write_memory: "memory.write",
  delete_memory: "memory.write",
  manage_members: "members.manage",
  manage_projects: "workspace.manage",
  manage_workspace: "workspace.manage",
  manage_ai: "workspace.manage",
  manage_billing: "billing.manage",
  execute_ai_action: "ai.execute",
  view_executive: "executive.view",
  upload_documents: "document.upload",
};

async function requireAuthenticatedGuardUser(scope: { routeId: string; workspaceId?: string; projectId?: string; permission?: Permission }) {
  const user = await getAuthUser();
  if (!user) {
    void logSecurityEvent("auth_denied", { ...scope, metadata: { reason: "unauthorized" } });
    throw new AccessDeniedError("Unauthorized.", { ...scope, reason: "unauthorized" });
  }
  return user;
}

async function authorizeGuard(input: {
  user: AuthUserContext;
  routeId: string;
  permission: Permission;
  workspaceId?: string | null;
  projectId?: string | null;
  resourceType: "workspace" | "project";
  resourceId: string;
  metadata?: Record<string, unknown>;
}) {
  const action = GOVERNANCE_ACTION_BY_PERMISSION[input.permission];
  const decision = await authorizeRuntimeAction(
    buildEnterpriseRuntimeRequest({
      user: input.user,
      action,
      routeId: input.routeId,
      workspaceId: input.workspaceId ?? null,
      projectId: input.projectId ?? null,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      metadata: { requestedPermission: input.permission, ...(input.metadata ?? {}) },
    }),
  );

  if (!decision.allowed) {
    void logSecurityEvent("denied_permission", {
      actorUserId: input.user.id,
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      requested_permission: input.permission,
      denied_permission: input.permission,
      routeId: input.routeId,
      metadata: { runtimeReason: decision.reason },
    });
    throw new AccessDeniedError("Authorization denied by enterprise runtime.", {
      reason: decision.reason,
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      permission: input.permission,
      evaluation: decision,
    });
  }

  return decision;
}

export async function requireWorkspaceMembership(workspaceId: string): Promise<{ user: AuthUserContext; workspaceId: string; role: WorkspaceRole }> {
  const user = await requireAuthenticatedGuardUser({ routeId: "requireWorkspaceMembership", workspaceId });
  await authorizeGuard({ user, routeId: "requireWorkspaceMembership", permission: "read", workspaceId, resourceType: "workspace", resourceId: workspaceId });

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("workspace_memberships").select("role").eq("workspace_id", workspaceId).eq("user_id", user.id).maybeSingle();
  const role = (data?.role as WorkspaceRole | undefined) ?? "external_stakeholder";

  return { user, workspaceId, role };
}

export async function requireProjectPermission(projectId: string, permission: Permission): Promise<{ user: AuthUserContext; projectId: string; workspaceId: string; role: WorkspaceRole }> {
  const user = await requireAuthenticatedGuardUser({ routeId: "requireProjectPermission", projectId, permission });

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("projects").select("workspace_id").eq("id", projectId).maybeSingle();
  if (!data?.workspace_id) {
    throw new AccessDeniedError("Project access denied.", { userId: user.id, projectId, reason: "project_not_found" });
  }

  const workspaceId = data.workspace_id as string;
  await authorizeGuard({ user, routeId: "requireProjectPermission", permission, workspaceId, projectId, resourceType: "project", resourceId: projectId });

  const { data: membership } = await supabase.from("workspace_memberships").select("role").eq("workspace_id", workspaceId).eq("user_id", user.id).maybeSingle();
  const role = (membership?.role as WorkspaceRole | undefined) ?? "external_stakeholder";

  return { user, projectId, workspaceId, role };
}

export async function requireWorkspaceRole(workspaceId: string, allowedRoles: WorkspaceRole[]) {
  const ctx = await requireWorkspaceMembership(workspaceId);
  if (!allowedRoles.includes(ctx.role)) {
    throw new AccessDeniedError("Workspace role denied.", { userId: ctx.user.id, workspaceId, role: ctx.role, reason: "role_compatibility_mismatch" });
  }
  return ctx;
}

export async function requireGovernancePermission(workspaceId: string, permission: Permission) {
  const user = await requireAuthenticatedGuardUser({ routeId: "requireGovernancePermission", workspaceId, permission });
  await authorizeGuard({ user, routeId: "requireGovernancePermission", permission, workspaceId, resourceType: "workspace", resourceId: workspaceId });
  return requireWorkspaceMembership(workspaceId);
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
