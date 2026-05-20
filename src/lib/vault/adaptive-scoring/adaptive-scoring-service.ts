/**
 * Adaptive Scoring Service — primary API for the Adaptive Severity &
 * Confidence Engine.
 *
 * Computes adaptive operational scores for learned patterns by integrating:
 *   - Recurrence amplification
 *   - Escalation trajectory
 *   - Recovery-aware suppression
 *   - Contradiction detection
 *   - Pattern status lifecycle
 *
 * All functions are pure and deterministic. No AI/LLMs. No global state.
 * Authorization: callers must verify workspace/project access before calling.
 */

import type { VaultNutrient } from "../digestive/types";
import type {
  VaultLearnedPattern,
  PatternSeverity,
} from "../learned-patterns/types";
import { detectContradictions } from "./contradiction-engine";
import { computeRecoveryProfile } from "./recovery-engine";
import {
  computeRecurrenceAmplifier,
  computeEscalationAmplifier,
  computeAdaptiveSeverity,
  SEVERITY_RANK,
} from "./severity-engine";
import { computeAdaptiveConfidence } from "./confidence-engine";
import type {
  AdaptiveScoringResult,
  AdaptiveOperationalContext,
  OperationalUrgency,
  AdaptiveScoringInput,
} from "./types";

// ─── Internal Helpers ─────────────────────────────────────────────────────────

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Computes operational urgency from adapted severity and confidence.
 * Higher severity + higher confidence = higher urgency.
 */
function computeOperationalUrgency(
  adaptedSeverity: PatternSeverity,
  adaptedConfidence: number,
  recoveryStrength: number,
): OperationalUrgency {
  const rank = SEVERITY_RANK[adaptedSeverity];

  // Apply recovery reduction to urgency
  const effectiveRank = Math.max(1, rank - recoveryStrength * 0.5);
  const effectiveConf = Math.max(0.05, adaptedConfidence - recoveryStrength * 0.1);

  if (effectiveRank >= 4 && effectiveConf >= 0.7) return "critical";
  if (effectiveRank >= 3.5 && effectiveConf >= 0.5) return "critical";
  if (effectiveRank >= 3 && effectiveConf >= 0.6) return "high";
  if (effectiveRank >= 3 && effectiveConf >= 0.4) return "high";
  if (effectiveRank >= 2.5 && effectiveConf >= 0.5) return "moderate";
  if (effectiveRank >= 2 && effectiveConf >= 0.55) return "moderate";
  if (effectiveRank >= 2 && effectiveConf >= 0.35) return "low";
  if (effectiveRank >= 1.5 && effectiveConf >= 0.4) return "low";
  return "informational";
}

/**
 * Computes escalation likelihood 0..1 from pattern metadata.
 *
 * Higher likelihood = operationally more dangerous.
 */
function computeEscalationLikelihood(
  pattern: VaultLearnedPattern,
  recoveryStrength: number,
  contradictionCount: number,
): number {
  const BASE_LIKELIHOOD: Partial<Record<VaultLearnedPattern["patternType"], number>> = {
    escalation_trajectory_pattern: 0.55,
    recurring_blocker_pattern: 0.40,
    financial_friction_pattern: 0.45,
    governance_degradation_pattern: 0.40,
    recurring_dependency_pattern: 0.35,
    stakeholder_pressure_pattern: 0.35,
    delivery_drift_pattern: 0.30,
    chronic_risk_pattern: 0.35,
    ambiguity_accumulation_pattern: 0.25,
    recovery_pattern: 0.05,
  };

  let likelihood = BASE_LIKELIHOOD[pattern.patternType] ?? 0.25;

  if (pattern.trajectory === "increasing") likelihood += 0.25;
  else if (pattern.trajectory === "decreasing" || pattern.trajectory === "recovered") likelihood -= 0.15;

  if (pattern.status === "chronic") likelihood += 0.20;
  else if (pattern.status === "confirmed") likelihood += 0.10;
  else if (pattern.status === "recovering" || pattern.status === "resolved") likelihood -= 0.15;

  if (recoveryStrength > 0.5) likelihood -= recoveryStrength * 0.25;
  else if (recoveryStrength > 0) likelihood -= recoveryStrength * 0.15;

  if (contradictionCount > 0) likelihood -= Math.min(0.10, contradictionCount * 0.05);

  return Math.round(Math.max(0, Math.min(1, likelihood)) * 100) / 100;
}

/**
 * Builds human-readable severity explanation lines.
 */
function buildSeverityExplanation(
  pattern: VaultLearnedPattern,
  result: Pick<AdaptiveScoringResult, "severityProfile" | "recoveryProfile" | "contradictionProfile">,
): string[] {
  const lines: string[] = [];

  if (result.severityProfile.wasAmplified) {
    lines.push(
      `Severity amplified from ${result.severityProfile.baseSeverity} → ${result.severityProfile.adaptedSeverity} (net modifier: +${result.severityProfile.netAmplification.toFixed(2)} rank).`,
    );
  } else if (result.severityProfile.wasSuppressed) {
    lines.push(
      `Severity suppressed from ${result.severityProfile.baseSeverity} → ${result.severityProfile.adaptedSeverity} (net modifier: ${result.severityProfile.netAmplification.toFixed(2)} rank).`,
    );
  } else {
    lines.push(
      `Severity unchanged at ${result.severityProfile.baseSeverity} — no amplifiers or suppressors triggered.`,
    );
  }

  for (const factor of result.severityProfile.amplifiers) {
    lines.push(`  + [${factor.reason}] ${factor.description}`);
  }
  for (const factor of result.severityProfile.suppressors) {
    lines.push(`  - [${factor.reason}] ${factor.description}`);
  }

  if (result.recoveryProfile.recoveryDetected) {
    lines.push(`Recovery: ${result.recoveryProfile.description}`);
  }

  if (result.contradictionProfile.totalContradictions > 0) {
    lines.push(
      `Contradictions: ${result.contradictionProfile.totalContradictions} contradiction(s) detected — ${result.contradictionProfile.totalSeverityImpact.toFixed(2)} rank suppression applied.`,
    );
  }

  return lines;
}

/**
 * Builds human-readable confidence explanation lines.
 */
function buildConfidenceExplanation(
  result: Pick<AdaptiveScoringResult, "confidenceProfile">,
): string[] {
  const lines: string[] = [];

  if (result.confidenceProfile.wasAmplified) {
    lines.push(
      `Confidence strengthened: ${result.confidenceProfile.baseConfidence.toFixed(2)} → ${result.confidenceProfile.adaptedConfidence.toFixed(2)} (net delta: +${result.confidenceProfile.netDelta.toFixed(2)}).`,
    );
  } else if (result.confidenceProfile.wasSuppressed) {
    lines.push(
      `Confidence weakened: ${result.confidenceProfile.baseConfidence.toFixed(2)} → ${result.confidenceProfile.adaptedConfidence.toFixed(2)} (net delta: ${result.confidenceProfile.netDelta.toFixed(2)}).`,
    );
  } else {
    lines.push(
      `Confidence stable at ${result.confidenceProfile.baseConfidence.toFixed(2)} — amplifiers and suppressors balanced.`,
    );
  }

  for (const factor of result.confidenceProfile.amplifiers) {
    lines.push(`  + [${factor.reason}] ${factor.description}`);
  }
  for (const factor of result.confidenceProfile.suppressors) {
    lines.push(`  - [${factor.reason}] ${factor.description}`);
  }

  return lines;
}

/**
 * Builds a short operational summary for this pattern.
 */
function buildOperationalSummary(
  pattern: VaultLearnedPattern,
  adaptedSeverity: PatternSeverity,
  adaptedConfidence: number,
  urgency: OperationalUrgency,
  escalationLikelihood: number,
  recoveryDetected: boolean,
): string {
  const recurrenceDesc =
    pattern.recurrenceProfile.totalOccurrences >= 5
      ? "chronically recurring"
      : pattern.recurrenceProfile.totalOccurrences >= 3
        ? "repeatedly recurring"
        : "recurring";

  const trajectoryDesc =
    pattern.trajectory === "increasing"
      ? "with escalating trajectory"
      : pattern.trajectory === "decreasing"
        ? "with decreasing trajectory"
        : pattern.trajectory === "stable"
          ? "with stable trajectory"
          : "";

  const recoveryDesc = recoveryDetected ? " Recovery signals detected." : "";

  return (
    `${pattern.patternType} (${pattern.status}) — ${recurrenceDesc} ${trajectoryDesc}. ` +
    `Adapted severity: ${adaptedSeverity}, confidence: ${adaptedConfidence.toFixed(2)}, ` +
    `urgency: ${urgency}, escalation likelihood: ${(escalationLikelihood * 100).toFixed(0)}%.` +
    recoveryDesc
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Computes adaptive scoring for a single learned pattern.
 *
 * @param pattern — The learned pattern to adaptively score.
 * @param allScopedNutrients — All nutrients for the same workspace+project,
 *   used to detect contradictions and recovery signals.
 */
export function computeAdaptiveScoring(
  pattern: VaultLearnedPattern,
  allScopedNutrients: VaultNutrient[],
): AdaptiveScoringResult {
  const computedAt = nowIso();

  const recurrenceAmplifier = computeRecurrenceAmplifier(pattern);
  const escalationAmplifier = computeEscalationAmplifier(pattern);
  const contradictionProfile = detectContradictions(pattern, allScopedNutrients);
  const recoveryProfile = computeRecoveryProfile(pattern, allScopedNutrients);

  const severityProfile = computeAdaptiveSeverity(
    pattern,
    recurrenceAmplifier,
    escalationAmplifier,
    contradictionProfile,
    recoveryProfile,
  );

  const confidenceProfile = computeAdaptiveConfidence(
    pattern,
    recurrenceAmplifier,
    escalationAmplifier,
    contradictionProfile,
    recoveryProfile,
  );

  const { adaptedSeverity } = severityProfile;
  const { adaptedConfidence } = confidenceProfile;

  const operationalUrgency = computeOperationalUrgency(
    adaptedSeverity,
    adaptedConfidence,
    recoveryProfile.recoveryStrength,
  );

  const escalationLikelihood = computeEscalationLikelihood(
    pattern,
    recoveryProfile.recoveryStrength,
    contradictionProfile.totalContradictions,
  );

  const partial = { severityProfile, confidenceProfile, recoveryProfile, contradictionProfile };
  const severityExplanation = buildSeverityExplanation(pattern, partial);
  const confidenceExplanation = buildConfidenceExplanation(partial);
  const operationalSummary = buildOperationalSummary(
    pattern,
    adaptedSeverity,
    adaptedConfidence,
    operationalUrgency,
    escalationLikelihood,
    recoveryProfile.recoveryDetected,
  );

  return {
    patternId: pattern.id,
    workspaceId: pattern.workspaceId,
    projectId: pattern.projectId,
    patternType: pattern.patternType,
    adaptedSeverity,
    adaptedConfidence,
    operationalUrgency,
    escalationLikelihood,
    severityProfile,
    confidenceProfile,
    contradictionProfile,
    recoveryProfile,
    recurrenceAmplifier,
    escalationAmplifier,
    severityExplanation,
    confidenceExplanation,
    operationalSummary,
    computedAt,
  };
}

/**
 * Computes adaptive scoring for all patterns in a workspace+project scope.
 *
 * Results are sorted by operational urgency (critical first) then by
 * escalation likelihood descending.
 */
export function computeAdaptiveScoringForProject(
  _context: AdaptiveScoringInput,
  patterns: VaultLearnedPattern[],
  allNutrients: VaultNutrient[],
): AdaptiveScoringResult[] {
  const scopedNutrients = allNutrients.filter(
    (n) =>
      n.workspaceId === _context.workspaceId &&
      (n.projectId ?? null) === _context.projectId,
  );

  const scopedPatterns = patterns.filter(
    (p) =>
      p.workspaceId === _context.workspaceId &&
      (p.projectId ?? null) === _context.projectId,
  );

  const URGENCY_RANK: Record<OperationalUrgency, number> = {
    critical: 5,
    high: 4,
    moderate: 3,
    low: 2,
    informational: 1,
  };

  return scopedPatterns
    .map((p) => computeAdaptiveScoring(p, scopedNutrients))
    .sort((a, b) => {
      const urgencyDiff = URGENCY_RANK[b.operationalUrgency] - URGENCY_RANK[a.operationalUrgency];
      if (urgencyDiff !== 0) return urgencyDiff;
      return b.escalationLikelihood - a.escalationLikelihood;
    });
}

/**
 * Returns adaptive severity for a single pattern.
 * Convenience wrapper around computeAdaptiveScoring.
 */
export function getAdaptiveSeverity(
  pattern: VaultLearnedPattern,
  allScopedNutrients: VaultNutrient[],
) {
  return computeAdaptiveScoring(pattern, allScopedNutrients).severityProfile;
}

/**
 * Returns adaptive confidence for a single pattern.
 * Convenience wrapper around computeAdaptiveScoring.
 */
export function getAdaptiveConfidence(
  pattern: VaultLearnedPattern,
  allScopedNutrients: VaultNutrient[],
) {
  return computeAdaptiveScoring(pattern, allScopedNutrients).confidenceProfile;
}

/**
 * Returns a human-readable explanation of the adaptive scoring for a pattern.
 */
export function explainAdaptiveScoring(result: AdaptiveScoringResult): string {
  const lines: string[] = [
    `=== Adaptive Scoring Explanation: ${result.patternType} ===`,
    `Pattern ID: ${result.patternId}`,
    `Workspace: ${result.workspaceId} | Project: ${result.projectId ?? "none"}`,
    ``,
    `SEVERITY:`,
    ...result.severityExplanation,
    ``,
    `CONFIDENCE:`,
    ...result.confidenceExplanation,
    ``,
    `OPERATIONAL SUMMARY:`,
    result.operationalSummary,
    ``,
    `Computed at: ${result.computedAt}`,
  ];
  return lines.join("\n");
}

/**
 * Builds a deterministic adaptive operational context for a workspace+project.
 *
 * Aggregates all adaptive scoring results into categorized views and
 * aggregate metrics suitable for injection into Copilot, executive
 * synthesis, intervention engines, and dashboards.
 */
export function getAdaptiveOperationalContext(
  _context: AdaptiveScoringInput,
  patterns: VaultLearnedPattern[],
  allNutrients: VaultNutrient[],
): AdaptiveOperationalContext {
  const results = computeAdaptiveScoringForProject(_context, patterns, allNutrients);

  const URGENCY_RANK: Record<OperationalUrgency, number> = {
    critical: 5,
    high: 4,
    moderate: 3,
    low: 2,
    informational: 1,
  };

  const activeChronicRisks = results.filter(
    (r) =>
      r.patternType === "chronic_risk_pattern" ||
      (r.severityProfile.adaptedSeverity === "critical" ||
        r.severityProfile.adaptedSeverity === "high") &&
        r.severityProfile.wasAmplified,
  );

  const risingEscalations = results.filter(
    (r) =>
      r.patternType === "escalation_trajectory_pattern" ||
      (r.escalationAmplifier.trajectory === "increasing" &&
        r.escalationLikelihood >= 0.5),
  );

  const weakeningSignals = results.filter(
    (r) =>
      r.confidenceProfile.wasSuppressed ||
      r.severityProfile.wasSuppressed,
  );

  const recoveryTrajectories = results.filter(
    (r) => r.recoveryProfile.recoveryDetected,
  );

  const unresolvedDependencies = results.filter(
    (r) =>
      (r.patternType === "recurring_dependency_pattern" ||
        r.patternType === "recurring_blocker_pattern") &&
      !r.recoveryProfile.recoveryDetected,
  );

  const governanceDegradation = results.filter(
    (r) => r.patternType === "governance_degradation_pattern",
  );

  const totalContradictionCount = results.reduce(
    (s, r) => s + r.contradictionProfile.totalContradictions,
    0,
  );

  const totalRecoveryCount = results.reduce(
    (s, r) => s + r.recoveryProfile.recoveryCount,
    0,
  );

  const highConfidencePatternCount = results.filter(
    (r) => r.adaptedConfidence >= 0.75,
  ).length;

  const confidenceShiftCount = results.filter(
    (r) => Math.abs(r.confidenceProfile.netDelta) >= 0.1,
  ).length;

  const severityAmplificationCount = results.filter(
    (r) => r.severityProfile.wasAmplified,
  ).length;

  const severitySuppressionCount = results.filter(
    (r) => r.severityProfile.wasSuppressed,
  ).length;

  // Operational readiness
  const hasRecovery = recoveryTrajectories.length > 0;
  const hasCritical = results.some((r) => r.operationalUrgency === "critical");
  const hasHigh = results.some((r) => r.operationalUrgency === "high");

  const operationalReadiness: AdaptiveOperationalContext["operationalReadiness"] =
    hasRecovery && !hasCritical
      ? "recovering"
      : hasCritical
        ? "critical"
        : hasHigh
          ? "at_risk"
          : "stable";

  const topUrgencyRank =
    results.length > 0 ? results[0].operationalUrgency : "informational";

  return {
    workspaceId: _context.workspaceId,
    projectId: _context.projectId,
    generatedAt: nowIso(),
    adaptiveScoringResults: results,
    activeChronicRisks,
    risingEscalations,
    weakeningSignals,
    recoveryTrajectories,
    unresolvedDependencies,
    governanceDegradation,
    totalContradictionCount,
    totalRecoveryCount,
    highConfidencePatternCount,
    confidenceShiftCount,
    severityAmplificationCount,
    severitySuppressionCount,
    operationalReadiness,
    topUrgencyRank,
  };
}
