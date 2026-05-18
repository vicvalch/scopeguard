import { getAuthUser, type AuthUserContext } from "@/lib/auth";
import { AccessDeniedError, requireProjectPermission, requireWorkspaceMembership, requireWorkspaceRole as requireAllowedWorkspaceRole } from "@/lib/security/access-guards";
import type { Permission, WorkspaceRole } from "@/lib/security/rbac";
import { evaluatePolicyDecision } from "@/lib/security/policy-engine";
import { ensurePmfreakAocAdaptersRegistered } from "@/lib/aoc/bootstrap";
import { resolveUserAocActorContext } from "@/lib/aoc/actor-context";

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
  ensurePmfreakAocAdaptersRegistered();
  const { user } = await requireAuthenticatedUser();
  const actor = resolveUserAocActorContext(user, { workspaceId: requirement.workspaceId, projectId: requirement.projectId });

  if (requirement.projectId && requirement.workspaceId) {
    let rbacAllowed = false;
    try { await requireProjectAccess(requirement.projectId, requirement.permission); rbacAllowed = true; } catch {}
    const result = await evaluatePolicyDecision({ actor, workspaceId: requirement.workspaceId, resourceType: "project", resourceId: requirement.projectId, permission: requirement.permission, rbacAllowed });
    if (result.decision === "allow") return { allowed: true as const, reason: result.reason, evaluation: result };
    throw new AccessDeniedError("Capability denied by policy pipeline.", { reason: result.reason, evaluation: result });
  }

  if (requirement.workspaceId) {
    let rbacAllowed = false;
    try { await requireWorkspaceMember(requirement.workspaceId); rbacAllowed = true; } catch {}
    const result = await evaluatePolicyDecision({ actor, workspaceId: requirement.workspaceId, resourceType: "workspace", resourceId: requirement.workspaceId, permission: requirement.permission, rbacAllowed });
    if (result.decision === "allow") return { allowed: true as const, reason: result.reason, evaluation: result };
    throw new AccessDeniedError("Capability denied by policy pipeline.", { reason: result.reason, evaluation: result });
  }

  throw new AccessDeniedError("Capability evaluation requires workspaceId or projectId.", { reason: "capability_scope_missing" });
}

export async function requireCapability(requirement: CapabilityRequirement) {
  return evaluateCapability(requirement);
}
