/**
 * Adaptive Severity & Confidence Engine — public exports.
 *
 * Consumers should import exclusively from this module, not from
 * individual sub-modules.
 *
 * This engine upgrades static pattern scoring with dynamic, longitudinal
 * operational context: recurrence history, escalation trajectories,
 * recovery signals, and contradiction evidence.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type {
  SeverityAdjustmentReason,
  ConfidenceAdjustmentReason,
  SeverityFactor,
  ConfidenceFactor,
  ContradictionType,
  ContradictionInstance,
  ContradictionProfile,
  RecoveryProfile,
  RecurrenceAmplifier,
  EscalationAmplifier,
  AdaptiveSeverityProfile,
  AdaptiveConfidenceProfile,
  SeverityEvolutionEntry,
  ConfidenceEvolutionEntry,
  SeverityEvolution,
  ConfidenceEvolution,
  OperationalUrgency,
  AdaptiveScoringResult,
  AdaptiveOperationalContext,
  AdaptiveScoringInput,
} from "./types";

// ─── Primary Service ──────────────────────────────────────────────────────────

export {
  computeAdaptiveScoring,
  computeAdaptiveScoringForProject,
  getAdaptiveSeverity,
  getAdaptiveConfidence,
  explainAdaptiveScoring,
  getAdaptiveOperationalContext,
} from "./adaptive-scoring-service";

// ─── Sub-Engines (for testing and advanced use) ───────────────────────────────

export { detectContradictions } from "./contradiction-engine";
export { computeRecoveryProfile } from "./recovery-engine";
export {
  computeRecurrenceAmplifier,
  computeEscalationAmplifier,
  computeAdaptiveSeverity,
  SEVERITY_RANK,
  rankToSeverity,
} from "./severity-engine";
export { computeAdaptiveConfidence } from "./confidence-engine";
