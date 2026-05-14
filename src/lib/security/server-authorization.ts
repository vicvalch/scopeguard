import { getAuthUser, type AuthUserContext } from "@/lib/auth";
import { AccessDeniedError, requireProjectPermission, requireWorkspaceMembership, requireWorkspaceRole as requireAllowedWorkspaceRole } from "@/lib/security/access-guards";
import type { Permission, WorkspaceRole } from "@/lib/security/rbac";

export type AuthenticatedContext = { user: AuthUserContext };

export async function requireAuthenticatedUser(): Promise<AuthenticatedContext> {
  const user = await getAuthUser();
  if (!user) {
    throw new AccessDeniedError("Unauthorized.", { reason: "unauthorized" });
  }
  return { user };
}

export async function requireWorkspaceContext(workspaceId: string | null | undefined) {
  const normalizedWorkspaceId = workspaceId?.trim();
  if (!normalizedWorkspaceId) {
    throw new AccessDeniedError("Workspace context required.", { reason: "workspace_missing" });
  }
  return { workspaceId: normalizedWorkspaceId };
}

export async function requireWorkspaceMember(workspaceId: string) {
  return requireWorkspaceMembership(workspaceId);
}

export async function requireWorkspaceRole(workspaceId: string, allowedRoles: WorkspaceRole[]) {
  return requireAllowedWorkspaceRole(workspaceId, allowedRoles);
}

export async function requireProjectAccess(projectId: string, permission: Permission = "read") {
  return requireProjectPermission(projectId, permission);
}

export async function requireResourceWorkspaceAccess(input: { workspaceId?: string; projectId?: string; permission?: Permission }) {
  if (input.projectId) return requireProjectAccess(input.projectId, input.permission ?? "read");
  if (input.workspaceId) return requireWorkspaceMember(input.workspaceId);
  throw new AccessDeniedError("Scoped access requires workspaceId or projectId.", { reason: "scope_missing" });
}

export function requireSystemOrWebhookSecret(receivedSecret: string | null | undefined, expectedSecret: string | undefined) {
  if (!expectedSecret || !receivedSecret || receivedSecret !== expectedSecret) {
    throw new AccessDeniedError("Invalid webhook authorization.", { reason: "invalid_webhook_secret" });
  }
}

export type CapabilityRequirement = { permission: Permission; workspaceId?: string; projectId?: string };

export async function evaluateCapability(requirement: CapabilityRequirement) {
  if (requirement.projectId) {
    const access = await requireProjectAccess(requirement.projectId, requirement.permission);
    return { allowed: true as const, reason: "role_mapped_policy", ...access };
  }

  if (requirement.workspaceId) {
    const member = await requireWorkspaceMember(requirement.workspaceId);
    return { allowed: true as const, reason: "workspace_membership", ...member };
  }

  throw new AccessDeniedError("Capability evaluation requires workspaceId or projectId.", { reason: "capability_scope_missing" });
}

export async function requireCapability(requirement: CapabilityRequirement) {
  return evaluateCapability(requirement);
}
