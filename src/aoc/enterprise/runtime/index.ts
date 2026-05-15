import {
  enforceGovernanceAction,
  evaluateGovernanceAction,
  type GovernanceEvaluationInput,
} from "@/lib/security/governance-runtime";

export type { GovernanceEvaluationInput };

export async function evaluateEnforcementPipeline(input: GovernanceEvaluationInput) {
  return evaluateGovernanceAction(input);
}

export async function enforceEnforcementPipeline(input: GovernanceEvaluationInput) {
  return enforceGovernanceAction(input);
}
