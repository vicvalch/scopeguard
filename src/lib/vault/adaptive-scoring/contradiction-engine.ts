/**
 * Contradiction Detection Engine.
 *
 * Detects operational contradictions between established patterns and
 * subsequent evidence. Contradictions reduce confidence and may reduce
 * severity but NEVER erase lineage or historical evidence.
 *
 * Deterministic. No AI. All rules are explicit and auditable.
 */

import type { VaultNutrient } from "../digestive/types";
import type { VaultLearnedPattern } from "../learned-patterns/types";
import type {
  ContradictionProfile,
  ContradictionInstance,
  ContradictionType,
} from "./types";

// ─── Contradiction Rules ──────────────────────────────────────────────────────

type ContradictionRule = {
  type: ContradictionType;
  /** Pattern types this rule applies to */
  patternTypes: VaultLearnedPattern["patternType"][];
  /** Nutrient types that represent contradiction evidence */
  contradictingNutrientTypes: VaultNutrient["nutrientType"][];
  confidenceImpact: number; // negative delta per contradiction instance
  severityImpact: number;   // negative rank modifier per instance
  description: (patternType: string, excerptHint: string) => string;
};

const CONTRADICTION_RULES: ContradictionRule[] = [
  {
    type: "blocker_resolved_after_persistent",
    patternTypes: ["recurring_blocker_pattern"],
    contradictingNutrientTypes: ["recovery_signal"],
    confidenceImpact: -0.10,
    severityImpact: -0.5,
    description: (patternType, hint) =>
      `Recovery evidence appeared after persistent ${patternType}: "${hint.slice(0, 80)}"`,
  },
  {
    type: "approval_completed_after_escalation",
    patternTypes: ["escalation_trajectory_pattern", "governance_degradation_pattern"],
    contradictingNutrientTypes: ["recovery_signal", "decision_signal"],
    confidenceImpact: -0.08,
    severityImpact: -0.4,
    description: (patternType, hint) =>
      `Resolution evidence appeared after ${patternType}: "${hint.slice(0, 80)}"`,
  },
  {
    type: "vendor_responded_after_no_response",
    patternTypes: ["recurring_dependency_pattern", "recurring_blocker_pattern"],
    contradictingNutrientTypes: ["recovery_signal", "commitment_signal"],
    confidenceImpact: -0.07,
    severityImpact: -0.3,
    description: (patternType, hint) =>
      `Vendor/dependency resolution appeared after ${patternType}: "${hint.slice(0, 80)}"`,
  },
  {
    type: "timeline_stabilized_after_drift",
    patternTypes: ["delivery_drift_pattern"],
    contradictingNutrientTypes: ["recovery_signal", "commitment_signal"],
    confidenceImpact: -0.08,
    severityImpact: -0.35,
    description: (patternType, hint) =>
      `Timeline stabilization evidence after ${patternType}: "${hint.slice(0, 80)}"`,
  },
  {
    type: "recovery_after_chronic",
    patternTypes: ["chronic_risk_pattern", "financial_friction_pattern"],
    contradictingNutrientTypes: ["recovery_signal"],
    confidenceImpact: -0.09,
    severityImpact: -0.4,
    description: (patternType, hint) =>
      `Recovery signal after chronic ${patternType}: "${hint.slice(0, 80)}"`,
  },
  {
    type: "generic_resolution",
    patternTypes: [
      "stakeholder_pressure_pattern",
      "ambiguity_accumulation_pattern",
    ],
    contradictingNutrientTypes: ["recovery_signal", "decision_signal"],
    confidenceImpact: -0.06,
    severityImpact: -0.25,
    description: (patternType, hint) =>
      `Resolution evidence appeared after ${patternType}: "${hint.slice(0, 80)}"`,
  },
];

// ─── Detection Logic ──────────────────────────────────────────────────────────

/**
 * Detects contradictions for a single pattern by looking for contradicting
 * nutrients that appeared AFTER the pattern's lastSeenAt timestamp.
 *
 * Contradictions reduce confidence and severity but do NOT erase history.
 * A contradiction is only counted once per (nutrient, rule) pair.
 */
export function detectContradictions(
  pattern: VaultLearnedPattern,
  scopedNutrients: VaultNutrient[],
): ContradictionProfile {
  const now = new Date().toISOString();
  const patternLastSeen = Date.parse(pattern.lastSeenAt);
  const instances: ContradictionInstance[] = [];
  const seenPairs = new Set<string>();

  for (const rule of CONTRADICTION_RULES) {
    if (!rule.patternTypes.includes(pattern.patternType)) continue;

    for (const nutrient of scopedNutrients) {
      if (!rule.contradictingNutrientTypes.includes(nutrient.nutrientType)) continue;

      const nutrientTs = Date.parse(nutrient.createdAt);
      if (isNaN(nutrientTs) || nutrientTs <= patternLastSeen) continue;

      const pairKey = `${rule.type}:${nutrient.id}`;
      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);

      const excerptHint = nutrient.evidence[0]?.excerpt ?? nutrient.summary ?? "";

      instances.push({
        contradictionType: rule.type,
        description: rule.description(pattern.patternType, excerptHint),
        evidenceTimestamp: nutrient.createdAt,
        affectedPatternTypes: [pattern.patternType],
        confidenceImpact: rule.confidenceImpact,
        severityImpact: rule.severityImpact,
      });
    }
  }

  // Cap total impacts to avoid over-suppression
  const rawConfidenceImpact = instances.reduce((s, i) => s + i.confidenceImpact, 0);
  const rawSeverityImpact = instances.reduce((s, i) => s + i.severityImpact, 0);

  return {
    totalContradictions: instances.length,
    instances: instances.slice(0, 10), // cap at 10 for auditability
    totalConfidenceImpact: Math.max(-0.40, rawConfidenceImpact),
    totalSeverityImpact: Math.max(-1.5, rawSeverityImpact),
    detectedAt: now,
  };
}
