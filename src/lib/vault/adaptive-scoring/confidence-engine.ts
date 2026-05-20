/**
 * Adaptive Confidence Engine.
 *
 * Computes adaptive confidence for a learned pattern by applying amplifiers
 * and suppressors to the base confidence from initial pattern scoring.
 *
 * Confidence represents: "How strongly should PMFreak trust this
 * operational interpretation?"
 *
 * Amplifiers: evidence consistency, cross-artifact corroboration, pattern
 * confirmation status, correlated signal types.
 *
 * Suppressors: contradictory evidence, weak/vague evidence, recovery
 * signals that weaken the operational basis.
 *
 * Deterministic. No AI. Same inputs → same outputs always.
 */

import type { VaultLearnedPattern } from "../learned-patterns/types";
import type {
  AdaptiveConfidenceProfile,
  ConfidenceFactor,
  RecurrenceAmplifier,
  EscalationAmplifier,
  ContradictionProfile,
  RecoveryProfile,
} from "./types";

// ─── Adaptive Confidence Computation ─────────────────────────────────────────

/**
 * Computes adaptive confidence for a learned pattern.
 *
 * The base confidence from initial scoring is adjusted by:
 *   Amplifiers:
 *   - Evidence consistency (cross-source corroboration)
 *   - Multi-day temporal spread across artifacts
 *   - Pattern confirmation status (confirmed/chronic)
 *   - Correlated trajectory + status alignment
 *   - Strong evidence lineage (many evidence references)
 *
 *   Suppressors:
 *   - Contradictory evidence
 *   - Weak base evidence
 *   - Recovery presence (reduces operational relevance)
 *   - Decreasing trajectory
 *
 * Final confidence is clamped to [0.05..0.99].
 */
export function computeAdaptiveConfidence(
  pattern: VaultLearnedPattern,
  recurrenceAmplifier: RecurrenceAmplifier,
  escalationAmplifier: EscalationAmplifier,
  contradictionProfile: ContradictionProfile,
  recoveryProfile: RecoveryProfile,
): AdaptiveConfidenceProfile {
  const baseConfidence = pattern.confidence;

  const amplifiers: ConfidenceFactor[] = [];
  const suppressors: ConfidenceFactor[] = [];

  const { distinctArtifacts, multiDaySpread, timeSpanDays, distinctDigestionRuns } =
    pattern.recurrenceProfile;

  // ── Amplifiers ──

  // 1. Evidence consistency (cross-artifact corroboration)
  if (distinctArtifacts >= 5) {
    amplifiers.push({
      reason: "evidence_consistency",
      direction: "amplify",
      delta: 0.15,
      description: `${distinctArtifacts} distinct artifacts corroborate this pattern — strong cross-source evidence.`,
    });
  } else if (distinctArtifacts >= 3) {
    amplifiers.push({
      reason: "evidence_consistency",
      direction: "amplify",
      delta: 0.10,
      description: `${distinctArtifacts} distinct artifacts corroborate this pattern.`,
    });
  } else if (distinctArtifacts >= 2) {
    amplifiers.push({
      reason: "evidence_consistency",
      direction: "amplify",
      delta: 0.05,
      description: `${distinctArtifacts} distinct artifacts corroborate this pattern.`,
    });
  }

  // 2. Cross-artifact recurrence (temporal diversity)
  if (multiDaySpread && timeSpanDays >= 14) {
    amplifiers.push({
      reason: "cross_artifact_recurrence",
      direction: "amplify",
      delta: 0.10,
      description: `Signal persisted across ${Math.round(timeSpanDays)} days — strong temporal evidence.`,
    });
  } else if (multiDaySpread && timeSpanDays >= 7) {
    amplifiers.push({
      reason: "cross_artifact_recurrence",
      direction: "amplify",
      delta: 0.06,
      description: `Signal persisted across ${Math.round(timeSpanDays)} days — moderate temporal evidence.`,
    });
  } else if (multiDaySpread) {
    amplifiers.push({
      reason: "cross_artifact_recurrence",
      direction: "amplify",
      delta: 0.03,
      description: `Signal spans multiple days — temporal diversity confirmed.`,
    });
  }

  // 3. Pattern confirmation status
  if (pattern.status === "chronic") {
    amplifiers.push({
      reason: "pattern_confirmation",
      direction: "amplify",
      delta: 0.15,
      description: `Pattern status is chronic — repeated long-term evidence confirms operational reality.`,
    });
  } else if (pattern.status === "confirmed") {
    amplifiers.push({
      reason: "pattern_confirmation",
      direction: "amplify",
      delta: 0.10,
      description: `Pattern status is confirmed — threshold crossed across multiple runs.`,
    });
  }

  // 4. Correlated signals (trajectory + status alignment)
  if (
    pattern.trajectory === "increasing" &&
    (pattern.status === "confirmed" || pattern.status === "chronic")
  ) {
    amplifiers.push({
      reason: "correlated_signals",
      direction: "amplify",
      delta: 0.10,
      description: `Increasing trajectory combined with ${pattern.status} status — correlated escalation signals strengthen confidence.`,
    });
  }

  // 5. Strong evidence lineage
  if (pattern.evidenceReferences.length >= 5) {
    amplifiers.push({
      reason: "strong_lineage",
      direction: "amplify",
      delta: 0.05,
      description: `${pattern.evidenceReferences.length} evidence references with specific excerpts — strong lineage backing.`,
    });
  }

  // 6. Recurrence cross-run boost
  if (recurrenceAmplifier.confidenceBoost > 0) {
    amplifiers.push({
      reason: "cross_artifact_recurrence",
      direction: "amplify",
      delta: recurrenceAmplifier.confidenceBoost,
      description: `${distinctDigestionRuns} distinct digestion runs confirm recurrence — confidence reinforced.`,
    });
  }

  // 7. Escalation confidence boost
  if (escalationAmplifier.confidenceBoost > 0 && pattern.trajectory === "increasing") {
    amplifiers.push({
      reason: "correlated_signals",
      direction: "amplify",
      delta: escalationAmplifier.confidenceBoost,
      description: `Escalation amplifier contribution: ${escalationAmplifier.description}`,
    });
  }

  // ── Suppressors ──

  // 1. Contradictory evidence
  if (contradictionProfile.totalConfidenceImpact < 0) {
    suppressors.push({
      reason: "contradictory_evidence",
      direction: "suppress",
      delta: contradictionProfile.totalConfidenceImpact,
      description: `${contradictionProfile.totalContradictions} contradiction(s) detected after pattern — confidence reduced by ${Math.abs(contradictionProfile.totalConfidenceImpact).toFixed(2)}.`,
    });
  }

  // 2. Weak base evidence
  if (baseConfidence < 0.6) {
    suppressors.push({
      reason: "weak_evidence",
      direction: "suppress",
      delta: -0.05,
      description: `Base confidence ${baseConfidence.toFixed(2)} is below 0.60 threshold — weak underlying evidence.`,
    });
  }

  // 3. Noise indicators (ambiguity accumulation with low recurrence)
  if (
    pattern.patternType === "ambiguity_accumulation_pattern" &&
    pattern.recurrenceProfile.totalOccurrences < 3
  ) {
    suppressors.push({
      reason: "noise_indicator",
      direction: "suppress",
      delta: -0.05,
      description: `Ambiguity accumulation with only ${pattern.recurrenceProfile.totalOccurrences} occurrences — possible noise.`,
    });
  }

  // 4. Recovery presence reduces operational confidence
  if (recoveryProfile.recoveryDetected && recoveryProfile.recoveryStrength > 0) {
    const recoveryImpact = -(recoveryProfile.recoveryStrength * 0.12);
    suppressors.push({
      reason: "recovery_present",
      direction: "suppress",
      delta: recoveryImpact,
      description: `Recovery signals detected (strength: ${(recoveryProfile.recoveryStrength * 100).toFixed(0)}%) — operational urgency basis reduced.`,
    });
  }

  // 5. Decreasing trajectory
  if (pattern.trajectory === "decreasing" || pattern.trajectory === "recovered") {
    suppressors.push({
      reason: "decay_dominance",
      direction: "suppress",
      delta: -0.06,
      description: `Trajectory is ${pattern.trajectory} — pattern resolving, confidence in ongoing risk reduced.`,
    });
  }

  // ── Compute Net Delta ──

  const netDelta =
    amplifiers.reduce((s, f) => s + f.delta, 0) +
    suppressors.reduce((s, f) => s + f.delta, 0);

  const adaptedConfidence = Math.round(
    Math.max(0.05, Math.min(0.99, baseConfidence + netDelta)) * 100,
  ) / 100;

  const allReasons = [
    ...amplifiers.map((f) => f.reason),
    ...suppressors.map((f) => f.reason),
  ];

  return {
    baseConfidence,
    adaptedConfidence,
    amplifiers,
    suppressors,
    netDelta: Math.round(netDelta * 100) / 100,
    wasAmplified: netDelta > 0,
    wasSuppressed: netDelta < 0,
    adjustmentReasons: allReasons,
  };
}
