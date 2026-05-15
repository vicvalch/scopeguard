import {
  enforceEnforcementPipeline,
  evaluateEnforcementPipeline,
  type GovernanceEvaluationInput,
} from "@aoc-enterprise/runtime";

/**
 * AOC Enterprise runtime boundary for PMFreak product code.
 */
export type { GovernanceEvaluationInput } from "@aoc-enterprise/runtime";

export async function evaluateRuntimeAuthorization(input: GovernanceEvaluationInput) {
  return evaluateEnforcementPipeline(input);
}

export async function enforceRuntimeAuthorization(input: GovernanceEvaluationInput) {
  return enforceEnforcementPipeline(input);
}
