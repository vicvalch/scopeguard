/**
 * Adaptive Severity Engine.
 *
 * Computes adaptive severity for a learned pattern by applying amplifiers
 * and suppressors to the base severity from initial pattern scoring.
 *
 * The adapted severity reflects longitudinal operational context:
 *   - recurrence history
 *   - escalation trajectory
 *   - recovery presence/absence
 *   - pattern status lifecycle
 *   - contradiction evidence
 *
 * Deterministic. No AI. Same inputs → same outputs always.
 */

import type { VaultLearnedPattern, PatternSeverity } from "../learned-patterns/types";
import type {
  AdaptiveSeverityProfile,
  SeverityFactor,
  RecurrenceAmplifier,
  EscalationAmplifier,
  ContradictionProfile,
  RecoveryProfile,
} from "./types";

// ─── Severity Rank Utilities ──────────────────────────────────────────────────

export const SEVERITY_RANK: Record<PatternSeverity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export function rankToSeverity(rank: number): PatternSeverity {
  if (rank >= 3.5) return "critical";
  if (rank >= 2.5) return "high";
  if (rank >= 1.5) return "medium";
  return "low";
}

// ─── Recurrence Amplifier Computation ────────────────────────────────────────

export function computeRecurrenceAmplifier(
  pattern: VaultLearnedPattern,
): RecurrenceAmplifier {
  const { totalOccurrences, distinctDigestionRuns, timeSpanDays } =
    pattern.recurrenceProfile;

  let severityAmplification = 0;
  let description: string;

  if (totalOccurrences >= 8 && distinctDigestionRuns >= 5) {
    severityAmplification = 1.0;
    description = `Severe recurrence: ${totalOccurrences} occurrences across ${distinctDigestionRuns} runs — full severity step amplified.`;
  } else if (totalOccurrences >= 5 && distinctDigestionRuns >= 4) {
    severityAmplification = 0.75;
    description = `High recurrence: ${totalOccurrences} occurrences across ${distinctDigestionRuns} runs.`;
  } else if (totalOccurrences >= 3 && distinctDigestionRuns >= 3) {
    severityAmplification = 0.5;
    description = `Moderate recurrence: ${totalOccurrences} occurrences across ${distinctDigestionRuns} runs.`;
  } else if (totalOccurrences >= 2 && distinctDigestionRuns >= 2) {
    severityAmplification = 0.25;
    description = `Emerging recurrence: ${totalOccurrences} occurrences across ${distinctDigestionRuns} runs.`;
  } else {
    description = `Insufficient recurrence for amplification: ${totalOccurrences} occurrences.`;
  }

  // Confidence boost from recurrence: more runs = stronger evidence
  const confidenceBoost = Math.min(
    0.3,
    (distinctDigestionRuns / 5) * 0.2 + (timeSpanDays / 14) * 0.1,
  );

  return {
    recurrenceCount: totalOccurrences,
    distinctRuns: distinctDigestionRuns,
    timeSpanDays,
    severityAmplification: Math.round(severityAmplification * 100) / 100,
    confidenceBoost: Math.round(confidenceBoost * 100) / 100,
    description,
  };
}

// ─── Escalation Amplifier Computation ────────────────────────────────────────

export function computeEscalationAmplifier(
  pattern: VaultLearnedPattern,
): EscalationAmplifier {
  const { trajectory, status } = pattern;

  let severityBoost = 0;
  let confidenceBoost = 0;
  const descriptions: string[] = [];

  if (trajectory === "increasing") {
    severityBoost += 0.5;
    confidenceBoost += 0.10;
    descriptions.push("Trajectory increasing — escalation amplified.");
  } else if (trajectory === "stable" && status === "chronic") {
    severityBoost += 0.25;
    confidenceBoost += 0.05;
    descriptions.push("Stable trajectory with chronic status — persistent risk amplified.");
  }

  if (status === "chronic") {
    severityBoost += 0.25;
    descriptions.push("Chronic status — long-term persistence amplified.");
  }

  if (
    pattern.patternType === "escalation_trajectory_pattern" ||
    pattern.patternType === "governance_degradation_pattern"
  ) {
    severityBoost += 0.25;
    descriptions.push(`Pattern type ${pattern.patternType} carries inherent escalation weight.`);
  }

  return {
    trajectory,
    status,
    severityBoost: Math.min(1.0, Math.round(severityBoost * 100) / 100),
    confidenceBoost: Math.min(0.2, Math.round(confidenceBoost * 100) / 100),
    description: descriptions.join(" ") || "No escalation amplification applied.",
  };
}

// ─── Adaptive Severity Computation ───────────────────────────────────────────

/**
 * Computes adaptive severity for a learned pattern.
 *
 * The base severity from initial scoring is adjusted by:
 * - recurrence amplification (more occurrences → higher severity)
 * - escalation trajectory (increasing → amplify)
 * - recovery absence (no recovery for chronic patterns → amplify)
 * - chronic status (long-term patterns → amplify)
 * - recovery presence (recent recovery → suppress)
 * - contradiction evidence (contradictions → suppress)
 * - trajectory decrease (decreasing trajectory → suppress)
 *
 * All modifications are additive rank adjustments, clamped to [1..4].
 */
export function computeAdaptiveSeverity(
  pattern: VaultLearnedPattern,
  recurrenceAmplifier: RecurrenceAmplifier,
  escalationAmplifier: EscalationAmplifier,
  contradictionProfile: ContradictionProfile,
  recoveryProfile: RecoveryProfile,
): AdaptiveSeverityProfile {
  const baseSeverity = pattern.severity;
  const baseRank = SEVERITY_RANK[baseSeverity];

  const amplifiers: SeverityFactor[] = [];
  const suppressors: SeverityFactor[] = [];

  // ── Amplifiers ──

  if (recurrenceAmplifier.severityAmplification > 0) {
    amplifiers.push({
      reason: "recurrence_amplification",
      direction: "amplify",
      magnitude: recurrenceAmplifier.severityAmplification,
      description: recurrenceAmplifier.description,
    });
  }

  if (escalationAmplifier.severityBoost > 0) {
    if (pattern.trajectory === "increasing") {
      amplifiers.push({
        reason: "escalation_trajectory_increasing",
        direction: "amplify",
        magnitude: escalationAmplifier.severityBoost,
        description: escalationAmplifier.description,
      });
    } else {
      amplifiers.push({
        reason: "chronic_status",
        direction: "amplify",
        magnitude: escalationAmplifier.severityBoost,
        description: escalationAmplifier.description,
      });
    }
  }

  if (
    !recoveryProfile.recoveryDetected &&
    (pattern.status === "confirmed" || pattern.status === "chronic")
  ) {
    amplifiers.push({
      reason: "recovery_absent_chronic",
      direction: "amplify",
      magnitude: 0.25,
      description: `No recovery signals detected for ${pattern.status} pattern — absence of resolution amplifies operational risk.`,
    });
  }

  if (
    pattern.patternType === "governance_degradation_pattern" &&
    pattern.recurrenceProfile.totalOccurrences >= 3
  ) {
    amplifiers.push({
      reason: "governance_degradation_accumulation",
      direction: "amplify",
      magnitude: 0.25,
      description: `Governance degradation accumulating across ${pattern.recurrenceProfile.totalOccurrences} occurrences — unresolved ownership compounds risk.`,
    });
  }

  if (
    pattern.recurrenceProfile.distinctDigestionRuns >= 3 &&
    (pattern.patternType === "recurring_dependency_pattern" ||
      pattern.patternType === "recurring_blocker_pattern")
  ) {
    amplifiers.push({
      reason: "dependency_clustering",
      direction: "amplify",
      magnitude: 0.25,
      description: `Dependency/blocker pattern spans ${pattern.recurrenceProfile.distinctDigestionRuns} distinct runs — clustered blocking impact.`,
    });
  }

  // ── Suppressors ──

  if (recoveryProfile.recoveryDetected && recoveryProfile.severitySuppression > 0) {
    suppressors.push({
      reason: "recovery_suppression",
      direction: "suppress",
      magnitude: -recoveryProfile.severitySuppression,
      description: recoveryProfile.description,
    });
  }

  if (contradictionProfile.totalSeverityImpact < 0) {
    suppressors.push({
      reason: "contradiction_weakening",
      direction: "suppress",
      magnitude: contradictionProfile.totalSeverityImpact,
      description: `${contradictionProfile.totalContradictions} contradiction(s) detected — combined severity impact: ${contradictionProfile.totalSeverityImpact.toFixed(2)} rank.`,
    });
  }

  if (
    pattern.trajectory === "decreasing" ||
    pattern.trajectory === "recovered"
  ) {
    suppressors.push({
      reason: "trajectory_decreasing",
      direction: "suppress",
      magnitude: -0.5,
      description: `Trajectory is ${pattern.trajectory} — severity decreasing as pattern resolves.`,
    });
  }

  if (pattern.status === "recovering" || pattern.status === "resolved") {
    suppressors.push({
      reason: "delivery_stabilized",
      direction: "suppress",
      magnitude: -0.25,
      description: `Pattern status is ${pattern.status} — delivery/operations stabilizing.`,
    });
  }

  // ── Compute Net Modifier ──

  const netAmplification =
    amplifiers.reduce((s, f) => s + f.magnitude, 0) +
    suppressors.reduce((s, f) => s + f.magnitude, 0);

  const adaptedRank = Math.max(1, Math.min(4, baseRank + netAmplification));
  const adaptedSeverity = rankToSeverity(adaptedRank);

  const allReasons = [
    ...amplifiers.map((f) => f.reason),
    ...suppressors.map((f) => f.reason),
  ];

  return {
    baseSeverity,
    adaptedSeverity,
    adaptedSeverityRank: Math.round(adaptedRank * 100) / 100,
    amplifiers,
    suppressors,
    netAmplification: Math.round(netAmplification * 100) / 100,
    wasAmplified: netAmplification > 0,
    wasSuppressed: netAmplification < 0,
    adjustmentReasons: allReasons,
  };
}
