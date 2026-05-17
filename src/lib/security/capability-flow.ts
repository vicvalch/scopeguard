import { createSupabaseServerClient } from "@/lib/supabase/server";
import { type Permission } from "@/lib/security/rbac";
import { AccessDeniedError, requireProjectPermission, requireWorkspaceRole } from "@/lib/security/access-guards";
import { evaluatePolicyDecision } from "@/lib/security/policy-engine";
import { requireAuthenticatedUser } from "@/lib/security/server-authorization";
import { resolveUserAocActorContext } from "@/lib/aoc/actor-context";

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
  const reqHours = input.expiresAt ? Math.ceil((new Date(input.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60)) : undefined;
  const evaluation = await evaluatePolicyDecision({ actor: resolveUserAocActorContext(user, { workspaceId: input.workspaceId }), workspaceId: input.workspaceId, resourceType: input.targetResourceType, resourceId: input.targetResourceId, permission: input.requestedPermission as Permission, requestedDurationHours: reqHours, justification: input.justification, rbacAllowed: false });

  const initialStatus = evaluation.decision === "deny" || evaluation.decision === "expired" ? "denied" : "pending";
  const { data, error } = await supabase.from("capability_requests").insert({ workspace_id: input.workspaceId, requester_user_id: user.id, target_resource_type: input.targetResourceType, target_resource_id: input.targetResourceId, requested_permission: input.requestedPermission, requested_scope: input.requestedScope ?? {}, justification: input.justification ?? null, grant_expires_at: input.expiresAt ?? null, status: initialStatus }).select("id").single<{ id: string }>();
  if (error || !data) throw new Error(error?.message ?? "Failed to create capability request");

  if (evaluation.decision === "allow") {
    await supabase.from("capability_requests").update({ status: "approved", evaluator_user_id: user.id, decided_at: nowIso(), updated_at: nowIso() }).eq("id", data.id);
    const { data: grant } = await supabase.from("capability_grants").insert({ capability_request_id: data.id, workspace_id: input.workspaceId, granted_user_id: user.id, granted_by_user_id: user.id, target_resource_type: input.targetResourceType, target_resource_id: input.targetResourceId, permission: input.requestedPermission, scope: input.requestedScope ?? {}, expires_at: input.expiresAt ?? null }).select("id").single<{ id: string }>();
    await audit(input.workspaceId, "approved", user.id, { autoApproved: true, policyDecision: evaluation.decision }, { requestId: data.id, grantId: grant?.id });
    return data.id;
  }

  await audit(input.workspaceId, "requested", user.id, { targetResourceType: input.targetResourceType, targetResourceId: input.targetResourceId, requestedPermission: input.requestedPermission, policyDecision: evaluation.decision, policyReason: evaluation.reason }, { requestId: data.id });
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
    const actor = resolveUserAocActorContext(user, { workspaceId: input.workspaceId, projectId: input.projectId });
    const supabase = await createSupabaseServerClient();
    const now = nowIso();
    const { data } = await supabase.from("capability_grants").select("id, target_resource_id, permission, expires_at, status").eq("workspace_id", input.workspaceId).eq("granted_user_id", user.id).eq("target_resource_type", input.projectId ? "project" : "workspace").eq("target_resource_id", input.projectId ?? input.workspaceId).eq("permission", input.permission).eq("status", "active");
    const decision = await evaluatePolicyDecision({ actor, workspaceId: input.workspaceId, resourceType: input.projectId ? "project" : "workspace", resourceId: input.projectId ?? input.workspaceId, permission: input.permission, rbacAllowed: false });
    if (decision.decision === "allow") {
      await audit(input.workspaceId, "consumed", user.id, { permission: input.permission, resourceId: input.projectId ?? input.workspaceId, policyReason: decision.reason }, { grantId: decision.matchedGrantId });
      return { allowed: true as const, reason: "policy_allow", grantId: decision.matchedGrantId };
    }
    throw new AccessDeniedError("Scoped capability denied.", { reason: decision.reason, workspaceId: input.workspaceId, permission: input.permission, projectId: input.projectId });
  }
}
