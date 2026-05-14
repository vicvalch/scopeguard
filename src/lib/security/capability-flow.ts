import { createSupabaseServerClient } from "@/lib/supabase/server";
import { type Permission } from "@/lib/security/rbac";
import { AccessDeniedError, requireProjectPermission, requireWorkspaceRole } from "@/lib/security/access-guards";
import { requireAuthenticatedUser } from "@/lib/security/server-authorization";

export type CapabilityPermission = "read" | "write" | "approve" | "manage" | "execute" | "delegate";
export type CapabilityResourceType = "workspace" | "project" | "operational_memory" | "governance_object" | "ai_coprocess";

function nowIso() { return new Date().toISOString(); }

async function audit(workspaceId: string, eventType: "requested" | "approved" | "denied" | "revoked" | "expired" | "consumed", actorUserId: string, detail: Record<string, unknown>, ids: { requestId?: string; grantId?: string } = {}) {
  const supabase = await createSupabaseServerClient();
  await supabase.from("capability_audit_events").insert({ workspace_id: workspaceId, actor_user_id: actorUserId, request_id: ids.requestId ?? null, grant_id: ids.grantId ?? null, event_type: eventType, event_detail: detail });
}

export async function createCapabilityRequest(input: { workspaceId: string; targetResourceType: CapabilityResourceType; targetResourceId: string; requestedPermission: CapabilityPermission; requestedScope?: Record<string, unknown>; justification?: string; expiresAt?: string | null; }) {
  const { user } = await requireAuthenticatedUser();
  await requireWorkspaceRole(input.workspaceId, ["owner", "admin", "PM", "contributor", "executive_viewer", "external_stakeholder", "ai_agent"]);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("capability_requests").insert({ workspace_id: input.workspaceId, requester_user_id: user.id, target_resource_type: input.targetResourceType, target_resource_id: input.targetResourceId, requested_permission: input.requestedPermission, requested_scope: input.requestedScope ?? {}, justification: input.justification ?? null, grant_expires_at: input.expiresAt ?? null }).select("id").single<{ id: string }>();
  if (error || !data) throw new Error(error?.message ?? "Failed to create capability request");
  await audit(input.workspaceId, "requested", user.id, { targetResourceType: input.targetResourceType, targetResourceId: input.targetResourceId, requestedPermission: input.requestedPermission }, { requestId: data.id });
  return data.id;
}

export async function evaluateCapabilityAccess(input: { workspaceId: string; projectId?: string; permission: Permission }) {
  try {
    if (input.projectId) {
      await requireProjectPermission(input.projectId, input.permission);
      return { allowed: true as const, reason: "rbac" };
    }
    await requireWorkspaceRole(input.workspaceId, ["owner", "admin", "PM", "contributor", "executive_viewer", "external_stakeholder", "ai_agent"]);
    return { allowed: true as const, reason: "rbac" };
  } catch {
    const { user } = await requireAuthenticatedUser();
    const supabase = await createSupabaseServerClient();
    const now = nowIso();
    const { data } = await supabase.from("capability_grants").select("id, target_resource_id, permission, expires_at, status").eq("workspace_id", input.workspaceId).eq("granted_user_id", user.id).eq("target_resource_type", input.projectId ? "project" : "workspace").eq("target_resource_id", input.projectId ?? input.workspaceId).eq("permission", input.permission).eq("status", "active");
    const grant = (data ?? []).find((g) => !g.expires_at || g.expires_at > now);
    if (grant) {
      await audit(input.workspaceId, "consumed", user.id, { permission: input.permission, resourceId: input.projectId ?? input.workspaceId }, { grantId: grant.id });
      return { allowed: true as const, reason: "capability_grant", grantId: grant.id };
    }
    throw new AccessDeniedError("Scoped capability denied.", { reason: "rbac_and_capability_denied", workspaceId: input.workspaceId, permission: input.permission, projectId: input.projectId });
  }
}
