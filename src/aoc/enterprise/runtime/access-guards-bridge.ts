import { AccessDeniedError } from "@/lib/security/access-guards";
import { getRuntimeAuthorityPort } from "./authority-provider";

export { AccessDeniedError };

export async function requireWorkspaceMembership(workspaceId: string) { return getRuntimeAuthorityPort().requireWorkspaceMembership(workspaceId); }
export async function requireWorkspaceRole(workspaceId: string, allowedRoles: any[]) { return getRuntimeAuthorityPort().requireWorkspaceRole(workspaceId, allowedRoles as any); }
export async function requireProjectAccess(projectId: string) { return getRuntimeAuthorityPort().requireProjectAccess(projectId); }
export async function requireProjectPermission(projectId: string, permission: any) { return getRuntimeAuthorityPort().requireProjectPermission(projectId, permission); }
export async function requireGovernancePermission(workspaceId: string, permission: any) { return getRuntimeAuthorityPort().requireGovernancePermission(workspaceId, permission); }
export async function requireScopedResourceAccess(input: { workspaceId?: string; projectId?: string }) {
  if (input.projectId) return requireProjectAccess(input.projectId);
  if (input.workspaceId) return requireWorkspaceMembership(input.workspaceId);
  throw new AccessDeniedError("Scoped access requires workspaceId or projectId.", { reason: "scope_missing" });
}
