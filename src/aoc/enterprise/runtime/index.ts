import {
  evaluateGovernanceAction,
  enforceGovernanceAction,
  type GovernanceEvaluationInput,
} from "./governance-core";

export type { GovernanceEvaluationInput };
export type {
  GovernanceActorType,
  GovernanceDecisionState,
  GovernanceDecisionStatus,
  GovernanceAction,
} from "./governance-core";
export {
  GOVERNANCE_POLICY_REGISTRY,
  evaluateGovernanceAction,
  enforceGovernanceAction,
  createApprovalRequestFromDecision,
  explainGovernanceDecision,
} from "./governance-core";

export async function evaluateEnforcementPipeline(input: GovernanceEvaluationInput) {
  return evaluateGovernanceAction(input);
}

export async function enforceEnforcementPipeline(input: GovernanceEvaluationInput) {
  return enforceGovernanceAction(input);
}
