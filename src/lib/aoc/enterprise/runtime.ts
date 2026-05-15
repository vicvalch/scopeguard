import {
  enforceEnforcementPipeline,
  evaluateEnforcementPipeline,
  type GovernanceEvaluationInput,
} from "@aoc-enterprise/runtime";

/**
 * PMFreak product-facing runtime authorization boundary.
 *
 * Product/API/SDK code must call these wrapper functions rather than importing
 * legacy governance runtime modules directly.
 *
 * Keep this surface intentionally small and stable: only safe evaluation/enforcement
 * operations are exported here.
 */
export type { GovernanceEvaluationInput } from "@aoc-enterprise/runtime";

export async function evaluateRuntimeAuthorization(input: GovernanceEvaluationInput) {
  return evaluateEnforcementPipeline(input);
}

export async function enforceRuntimeAuthorization(input: GovernanceEvaluationInput) {
  return enforceEnforcementPipeline(input);
}
