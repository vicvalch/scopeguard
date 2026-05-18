import { getAuthUser, type AuthUserContext } from "@/lib/auth";
import { AccessDeniedError, requireProjectPermission, requireWorkspaceMembership, requireWorkspaceRole as requireAllowedWorkspaceRole } from "@/lib/security/access-guards";
import type { Permission, WorkspaceRole } from "@/lib/security/rbac";
import { authorizeRuntimeAction } from "@/lib/aoc/enterprise/authorization";

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
  const { user } = await requireAuthenticatedUser();
  const action = requirement.projectId ? "project.read" : "workspace.manage";
  const decision = await authorizeRuntimeAction({
    actorType: "user",
    actorUserId: user.id,
    workspaceId: requirement.workspaceId ?? null,
    projectId: requirement.projectId ?? null,
    resourceType: requirement.projectId ? "project" : "workspace",
    resourceId: requirement.projectId ?? requirement.workspaceId ?? null,
    action,
    routeId: "server-authorization.evaluateCapability",
    metadata: { requestedPermission: requirement.permission },
  });

  if (decision.allowed) return { allowed: true as const, reason: decision.reason, evaluation: decision };
  throw new AccessDeniedError("Capability denied by enterprise runtime.", { reason: decision.reason, evaluation: decision });
}

export async function requireCapability(requirement: CapabilityRequirement) {
  return evaluateCapability(requirement);
}
