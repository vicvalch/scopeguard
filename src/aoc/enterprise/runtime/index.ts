import {
  evaluateGovernanceAction as evaluateGovernanceActionWithContext,
  enforceGovernanceAction as enforceGovernanceActionWithContext,
  type GovernanceEvaluationInput,
} from "./governance-core";
import { composeRuntimeContext } from "./composition";

export type { GovernanceEvaluationInput };
export type {
  GovernanceActorType,
  GovernanceDecisionState,
  GovernanceDecisionStatus,
  GovernanceAction,
  GovernanceDecisionResult,
} from "./governance-core";
export {
  GOVERNANCE_POLICY_REGISTRY,
  evaluateGovernanceAction,
  enforceGovernanceAction,
  createApprovalRequestFromDecision,
  explainGovernanceDecision,
} from "./governance-core";
export type {
  RuntimeContext,
  RuntimeSecurityContext,
  RuntimeGovernanceContext,
  RuntimeCapabilityContext,
  RuntimeAuditContext,
  RuntimeMetadata,
} from "./context";
export {
  runtimeContextToCapabilityClaimPorts,
  runtimeContextToCapabilityVerificationPorts,
} from "./context";
export {
  composeRuntimeContext,
  composeCapabilityClaimPorts,
  composeCapabilityVerificationPorts,
} from "./composition";

export async function evaluateEnforcementPipeline(input: GovernanceEvaluationInput) {
  return evaluateGovernanceActionWithContext(composeRuntimeContext(), input);
}

export async function enforceEnforcementPipeline(input: GovernanceEvaluationInput) {
  return enforceGovernanceActionWithContext(composeRuntimeContext(), input);
}
