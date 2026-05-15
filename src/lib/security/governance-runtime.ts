/**
 * LEGACY GOVERNANCE RUNTIME
 * TODO(aoc-migration): keep for compatibility until all routes use @/lib/aoc/enterprise/runtime wrappers backed by @aoc-enterprise/runtime.
 */
import { AccessDeniedError, requireAgentScope, requireGovernancePermission, requireProjectPermission, requireWorkspaceMembership } from "@/lib/security/access-guards";
import { verifyAgentAttestation } from "@/lib/security/agent-attestation";
import { denyResponse } from "@/lib/security/deny-response";
import { createPrivilegedSupabaseClient } from "@/lib/security/privileged-access";
import type { Permission, WorkspaceRole } from "@/lib/security/rbac";
import { logSecurityEvent, type SecurityEventType } from "@/lib/security/telemetry";

export type GovernanceActorType = "user" | "ai_agent" | "system";
export type GovernanceDecisionState = "allow" | "deny" | "require_human_approval" | "require_admin_approval" | "require_additional_scope";
export type GovernanceDecisionStatus = "evaluated" | "pending_approval" | "approved" | "rejected" | "expired" | "cancelled" | "executed_after_approval";
export type GovernanceAction =
  | "project.read" | "project.write" | "memory.read" | "memory.write" | "document.upload"
  | "billing.manage" | "members.manage" | "ai.execute" | "ai.manage" | "workspace.manage" | "executive.view" | "privileged.use";

type ApprovalType = "human" | "admin";

export type GovernanceEvaluationInput = { actorType: GovernanceActorType; actorUserId?: string | null; actorAgentId?: string | null; workspaceId?: string | null; projectId?: string | null; actorRole?: WorkspaceRole | null; requestedPermission?: Permission | null; resourceType?: string | null; resourceId?: string | null; action: GovernanceAction; routeId: string; metadata?: Record<string, unknown>; agentToken?: string | null; systemActor?: string | null; };
type GovernancePolicy = { requiredPermission: Permission; minimumRole?: WorkspaceRole; allowedActorTypes: GovernanceActorType[]; agentCompatible: boolean; denyEventType: SecurityEventType; riskLevel: "low"|"medium"|"high"|"critical"; projectScoped?: boolean; workspaceScoped?: boolean; requiresSystemContext?: boolean };
export const GOVERNANCE_POLICY_REGISTRY: Record<GovernanceAction, GovernancePolicy> = {
  "project.read": { requiredPermission: "read", allowedActorTypes: ["user", "ai_agent"], agentCompatible: true, denyEventType: "project_scope_violation", riskLevel: "low", projectScoped: true },
  "project.write": { requiredPermission: "write", allowedActorTypes: ["user", "ai_agent"], agentCompatible: true, denyEventType: "denied_permission", riskLevel: "medium", projectScoped: true },
  "memory.read": { requiredPermission: "read", allowedActorTypes: ["user", "ai_agent"], agentCompatible: true, denyEventType: "denied_permission", riskLevel: "medium", projectScoped: true },
  "memory.write": { requiredPermission: "write_memory", allowedActorTypes: ["user", "ai_agent"], agentCompatible: true, denyEventType: "denied_permission", riskLevel: "high", projectScoped: true },
  "document.upload": { requiredPermission: "upload_documents", allowedActorTypes: ["user", "ai_agent"], agentCompatible: true, denyEventType: "denied_permission", riskLevel: "high", projectScoped: true },
  "billing.manage": { requiredPermission: "manage_billing", minimumRole: "owner", allowedActorTypes: ["user"], agentCompatible: false, denyEventType: "billing_governance_denied", riskLevel: "critical", workspaceScoped: true },
  "members.manage": { requiredPermission: "manage_members", allowedActorTypes: ["user"], agentCompatible: false, denyEventType: "governance_violation", riskLevel: "high", workspaceScoped: true },
  "ai.execute": { requiredPermission: "execute_ai_action", allowedActorTypes: ["user", "ai_agent"], agentCompatible: true, denyEventType: "unsafe_agent_attempt", riskLevel: "high", workspaceScoped: true },
  "ai.manage": { requiredPermission: "manage_ai", allowedActorTypes: ["user"], agentCompatible: false, denyEventType: "governance_violation", riskLevel: "high", workspaceScoped: true },
  "workspace.manage": { requiredPermission: "manage_workspace", allowedActorTypes: ["user"], agentCompatible: false, denyEventType: "workspace_scope_violation", riskLevel: "critical", workspaceScoped: true },
  "executive.view": { requiredPermission: "view_executive", allowedActorTypes: ["user", "ai_agent"], agentCompatible: true, denyEventType: "denied_permission", riskLevel: "medium", workspaceScoped: true },
  "privileged.use": { requiredPermission: "manage_workspace", allowedActorTypes: ["system"], agentCompatible: false, denyEventType: "suspicious_permission_escalation", riskLevel: "critical", workspaceScoped: true, requiresSystemContext: true },
};

const decisionNeedsApproval = (input: GovernanceEvaluationInput, riskLevel: string): { decision: GovernanceDecisionState; approvalType: ApprovalType; reviewerRoleRequired: WorkspaceRole } | null => {
  if (input.action === "ai.execute" && riskLevel === "high") return { decision: "require_human_approval", approvalType: "human", reviewerRoleRequired: "admin" };
  if (input.action === "document.upload" && input.actorRole === "external_stakeholder") return { decision: "require_human_approval", approvalType: "human", reviewerRoleRequired: "admin" };
  if (input.action === "billing.manage" && input.actorRole === "admin") return { decision: "require_admin_approval", approvalType: "admin", reviewerRoleRequired: "owner" };
  if (input.action === "privileged.use" && input.systemActor !== "trusted_webhook") return { decision: "require_admin_approval", approvalType: "admin", reviewerRoleRequired: "admin" };
  return null;
};

export async function evaluateGovernanceAction(input: GovernanceEvaluationInput) { /* trimmed: retains existing checks */
  const policy = GOVERNANCE_POLICY_REGISTRY[input.action]; const decisionId = crypto.randomUUID(); const trace: Array<Record<string, unknown>> = [];
  const deny = (reason: string) => ({ allowed: false as const, decision: "deny" as GovernanceDecisionState, reason });
  trace.push({ rule: "policy_registry", result: "checked", reason: `matched ${input.action}` });
  if (!policy.allowedActorTypes.includes(input.actorType)) return finalize(deny(`Denied because actor type ${input.actorType} cannot execute ${input.action}.`));
  if (input.actorType === "ai_agent" && !policy.agentCompatible) return finalize(deny(`Denied because ${input.action} is not agent compatible.`));
  if (policy.workspaceScoped && !input.workspaceId) return finalize(deny("Denied because workspace scope is missing."));
  if (policy.projectScoped && !input.projectId) return finalize(deny("Denied because project scope is missing for project-scoped action."));
  if (input.actorType === "system" && policy.requiresSystemContext && !input.systemActor) return finalize(deny("Denied because systemActor context is required."));
  try { if (input.actorType === "user") { if (policy.projectScoped && input.projectId) { const ctx = await requireProjectPermission(input.projectId, policy.requiredPermission); trace.push({ rule: "project_binding_checked", roleChecked: ctx.role, scopeChecked: "project", result: "passed", reason: "project permission granted" }); } else if (policy.workspaceScoped && input.workspaceId) { const ctx = await requireGovernancePermission(input.workspaceId, policy.requiredPermission); trace.push({ rule: "workspace_membership_checked", roleChecked: ctx.role, scopeChecked: "workspace", result: "passed", reason: "workspace governance permission granted" }); } }
    if (input.actorType === "ai_agent") { if (!input.actorAgentId) return finalize(deny("Denied because AI agent actor id is missing.")); if (!input.workspaceId) return finalize(deny("Denied because AI agent workspace scope is missing.")); if (input.agentToken) { await verifyAgentAttestation({ token: input.agentToken, expectedAgentId: input.actorAgentId, workspaceId: input.workspaceId, permission: policy.requiredPermission, projectId: input.projectId ?? undefined }); trace.push({ rule: "agent_attestation_checked", agentScopeChecked: true, result: "passed", reason: "attestation verified" }); } await requireAgentScope({ workspaceId: input.workspaceId, agentId: input.actorAgentId, permission: policy.requiredPermission, projectId: input.projectId ?? undefined }); trace.push({ rule: "agent_scope_checked", projectBindingChecked: input.projectId ?? null, result: "passed", reason: "agent scope granted" }); }
    if (input.actorType === "system" && input.workspaceId) { await requireWorkspaceMembership(input.workspaceId); trace.push({ rule: "system_workspace_binding", privilegedContextChecked: Boolean(input.systemActor), result: "passed", reason: "system actor has explicit context" }); }
  } catch (error) { const reason = error instanceof AccessDeniedError ? String(error.metadata.reason ?? error.message) : "governance_denied"; trace.push({ rule: "composed_guard", result: "denied", reason }); return finalize(deny(`Denied because ${reason}.`)); }
  const approvalRule = decisionNeedsApproval(input, policy.riskLevel);
  if (approvalRule) return finalize({ allowed: false, decision: approvalRule.decision, reason: `Action requires ${approvalRule.approvalType} approval.`, requiredApprovalType: approvalRule.approvalType, reviewerRoleRequired: approvalRule.reviewerRoleRequired });
  return finalize({ allowed: true as const, decision: "allow" as GovernanceDecisionState, reason: "Allowed by governance policy and composed guard checks." });

  function finalize(result: { allowed: boolean; decision: GovernanceDecisionState; reason: string; requiredApprovalType?: ApprovalType; reviewerRoleRequired?: WorkspaceRole }) {
    const output = { allowed: result.allowed, decision: result.decision, decisionId, reason: result.reason, requiredPermission: policy.requiredPermission, matchedPolicy: input.action, evaluatedAt: new Date().toISOString(), actor: { type: input.actorType, userId: input.actorUserId ?? null, agentId: input.actorAgentId ?? null, role: input.actorRole ?? null, systemActor: input.systemActor ?? null }, scope: { workspaceId: input.workspaceId ?? null, projectId: input.projectId ?? null, resourceType: input.resourceType ?? null, resourceId: input.resourceId ?? null }, riskLevel: policy.riskLevel, status: result.decision.includes("approval") ? "pending_approval" : "evaluated", requiredApprovalType: result.requiredApprovalType ?? null, reviewerRoleRequired: result.reviewerRoleRequired ?? null, auditEventType: result.allowed ? "governance_violation" : policy.denyEventType, trace };
    void logSecurityEvent(result.decision.includes("approval") ? "approval_requested" : (result.allowed ? "governance_violation" : policy.denyEventType), { routeId: input.routeId, actorUserId: input.actorUserId ?? null, actorAgentId: input.actorAgentId ?? null, workspaceId: input.workspaceId ?? null, projectId: input.projectId ?? null, actorRole: input.actorRole ?? null, requested_permission: policy.requiredPermission, denied_permission: result.allowed ? null : policy.requiredPermission, resourceType: input.resourceType ?? null, resourceId: input.resourceId ?? null, metadata: { governanceDecision: output } });
    return output;
  }
}

export async function createApprovalRequestFromDecision(decision: Awaited<ReturnType<typeof evaluateGovernanceAction>>) {
  if (!decision.requiredApprovalType || !decision.scope.workspaceId) return null;
  const supabase = createPrivilegedSupabaseClient({ routeId: "governance.approvals", operation: "create_approval", reason: "persist_approval_request", systemActor: "system", workspaceId: decision.scope.workspaceId });
  const payload = { decision_id: decision.decisionId, workspace_id: decision.scope.workspaceId, project_id: decision.scope.projectId, actor_user_id: decision.actor.userId, actor_agent_id: decision.actor.agentId, action: decision.matchedPolicy, requested_permission: decision.requiredPermission, required_approval_type: decision.requiredApprovalType, reviewer_role_required: decision.reviewerRoleRequired, status: "pending_approval", reason: decision.reason, risk_level: decision.riskLevel, trace: decision.trace, metadata: {}, expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() };
  const { data, error } = await supabase.from("governance_approval_requests").upsert(payload, { onConflict: "decision_id" }).select("id").single();
  if (error) throw new Error(`create approval failed: ${error.message}`);
  return data;
}

export function explainGovernanceDecision(decision: Awaited<ReturnType<typeof evaluateGovernanceAction>>) { return `${decision.allowed ? "Allowed" : "Denied"}: ${decision.reason} (policy=${decision.matchedPolicy}, permission=${decision.requiredPermission}, decisionId=${decision.decisionId})`; }
export async function enforceGovernanceAction(input: GovernanceEvaluationInput) { const decision = await evaluateGovernanceAction(input); if (decision.decision.includes("approval")) await createApprovalRequestFromDecision(decision); if (!decision.allowed) { return { decision, response: denyResponse({ status: 403, routeId: input.routeId, message: "Governance policy denied.", reason: decision.reason, actorUserId: input.actorUserId ?? null, actorAgentId: input.actorAgentId ?? null, workspaceId: input.workspaceId ?? null, projectId: input.projectId ?? null, requestedPermission: decision.requiredPermission, deniedPermission: decision.requiredPermission, actorRole: input.actorRole ?? null, eventType: decision.auditEventType as SecurityEventType, metadata: { decisionId: decision.decisionId, matchedPolicy: decision.matchedPolicy, riskLevel: decision.riskLevel } }) }; } return { decision, response: null }; }
