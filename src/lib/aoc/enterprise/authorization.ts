import {
  enforceEnforcementPipeline,
  type GovernanceEvaluationInput,
  type GovernanceDecisionState,
} from "@aoc-enterprise/runtime";
import { ensurePmfreakAocAdaptersRegistered } from "@/lib/aoc/bootstrap";

export type EnterpriseRuntimeDecision = {
  allowed: boolean;
  decisionId: string;
  decision: GovernanceDecisionState;
  enforcementLevel: "hard" | "soft";
  reason: string;
  evaluatedPolicies: string[];
  evaluatedCapabilities: string[];
  auditRequired: boolean;
  trustContext: { actorType: string; actorUserId: string | null; actorAgentId: string | null; riskLevel: string };
  runtimeMetadata: Record<string, unknown>;
};

export function normalizeRuntimeDecision(decision: Awaited<ReturnType<typeof enforceEnforcementPipeline>>["decision"]): EnterpriseRuntimeDecision {
  return {
    allowed: decision.allowed,
    decisionId: decision.decisionId,
    decision: decision.decision,
    enforcementLevel: decision.allowed ? "soft" : "hard",
    reason: decision.reason,
    evaluatedPolicies: [decision.matchedPolicy],
    evaluatedCapabilities: [decision.requiredPermission],
    auditRequired: true,
    trustContext: {
      actorType: decision.actor.type,
      actorUserId: decision.actor.userId,
      actorAgentId: decision.actor.agentId,
      riskLevel: decision.riskLevel,
    },
    runtimeMetadata: {
      status: decision.status,
      requiredApprovalType: decision.requiredApprovalType,
      reviewerRoleRequired: decision.reviewerRoleRequired,
      trace: decision.trace,
      scope: decision.scope,
      evaluatedAt: decision.evaluatedAt,
    },
  };
}

export async function authorizeRuntimeAction(input: GovernanceEvaluationInput) {
  ensurePmfreakAocAdaptersRegistered();
  const result = await enforceEnforcementPipeline(input);
  return normalizeRuntimeDecision(result.decision);
}
