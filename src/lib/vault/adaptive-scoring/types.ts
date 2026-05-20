/**
 * Types for the Adaptive Severity & Confidence Engine.
 *
 * All adaptive scores are deterministic, evidence-backed, and explainable.
 * No AI/LLMs. No embeddings. No hidden probabilistic logic.
 */

import type { PatternSeverity, PatternTrajectory, PatternStatus, LearnedPatternType } from "../learned-patterns/types";

// ─── Adjustment Reasons ───────────────────────────────────────────────────────

export type SeverityAdjustmentReason =
  | "recurrence_amplification"
  | "escalation_trajectory_increasing"
  | "recovery_absent_chronic"
  | "chronic_status"
  | "governance_degradation_accumulation"
  | "dependency_clustering"
  | "recovery_suppression"
  | "contradiction_weakening"
  | "trajectory_decreasing"
  | "delivery_stabilized"
  | "decay_dominance"
  | "fresh_evidence_contradiction";

export type ConfidenceAdjustmentReason =
  | "evidence_consistency"
  | "cross_artifact_recurrence"
  | "strong_lineage"
  | "pattern_confirmation"
  | "correlated_signals"
  | "contradictory_evidence"
  | "weak_evidence"
  | "noise_indicator"
  | "decay_dominance"
  | "recovery_present";

// ─── Factor Profiles ──────────────────────────────────────────────────────────

export type SeverityFactor = {
  reason: SeverityAdjustmentReason;
  direction: "amplify" | "suppress";
  /** Additive modifier to severity rank (positive = amplify, negative = suppress) */
  magnitude: number;
  description: string;
  evidenceRef?: string;
};

export type ConfidenceFactor = {
  reason: ConfidenceAdjustmentReason;
  direction: "amplify" | "suppress";
  /** Delta applied to confidence 0..1 */
  delta: number;
  description: string;
  evidenceRef?: string;
};

// ─── Contradiction Profile ────────────────────────────────────────────────────

export type ContradictionType =
  | "blocker_resolved_after_persistent"
  | "approval_completed_after_escalation"
  | "vendor_responded_after_no_response"
  | "timeline_stabilized_after_drift"
  | "recovery_after_chronic"
  | "generic_resolution";

export type ContradictionInstance = {
  contradictionType: ContradictionType;
  description: string;
  evidenceTimestamp: string;
  affectedPatternTypes: LearnedPatternType[];
  confidenceImpact: number; // negative delta (stored as negative value)
  severityImpact: number;   // negative rank modifier (stored as negative value)
};

export type ContradictionProfile = {
  totalContradictions: number;
  instances: ContradictionInstance[];
  /** Combined confidence suppression from all contradictions (negative sum) */
  totalConfidenceImpact: number;
  /** Combined severity suppression from all contradictions (negative sum) */
  totalSeverityImpact: number;
  detectedAt: string;
};

// ─── Recovery Profile ─────────────────────────────────────────────────────────

export type RecoveryProfile = {
  recoveryDetected: boolean;
  recoveryCount: number;
  /** Composite strength 0..1 (based on count + recency) */
  recoveryStrength: number;
  /** How much severity rank is suppressed (0..1.5 rank reduction) */
  severitySuppression: number;
  /** How much operational urgency is reduced (0..1) */
  urgencyReduction: number;
  /** Operational memory is preserved even when recovery is detected */
  operationalMemoryPreserved: boolean;
  description: string;
  latestRecoveryAt: string | null;
};

// ─── Recurrence Amplifier ─────────────────────────────────────────────────────

export type RecurrenceAmplifier = {
  recurrenceCount: number;
  distinctRuns: number;
  timeSpanDays: number;
  /** Rank added to severity (0..1.0) */
  severityAmplification: number;
  /** Delta added to confidence (0..0.3) */
  confidenceBoost: number;
  description: string;
};

// ─── Escalation Amplifier ─────────────────────────────────────────────────────

export type EscalationAmplifier = {
  trajectory: PatternTrajectory;
  status: PatternStatus;
  /** Severity rank boost (0..0.5) */
  severityBoost: number;
  /** Confidence delta (0..0.2) */
  confidenceBoost: number;
  description: string;
};

// ─── Adaptive Profiles ────────────────────────────────────────────────────────

export type AdaptiveSeverityProfile = {
  baseSeverity: PatternSeverity;
  adaptedSeverity: PatternSeverity;
  /** Continuous rank 1.0–4.0 before snapping to enum */
  adaptedSeverityRank: number;
  amplifiers: SeverityFactor[];
  suppressors: SeverityFactor[];
  /** Total net rank modifier applied (sum of amplifiers + suppressors) */
  netAmplification: number;
  wasAmplified: boolean;
  wasSuppressed: boolean;
  adjustmentReasons: SeverityAdjustmentReason[];
};

export type AdaptiveConfidenceProfile = {
  baseConfidence: number;
  adaptedConfidence: number;
  amplifiers: ConfidenceFactor[];
  suppressors: ConfidenceFactor[];
  netDelta: number;
  wasAmplified: boolean;
  wasSuppressed: boolean;
  adjustmentReasons: ConfidenceAdjustmentReason[];
};

// ─── Evolution Tracking ───────────────────────────────────────────────────────

export type SeverityEvolutionEntry = {
  timestamp: string;
  baseSeverity: PatternSeverity;
  adaptedSeverity: PatternSeverity;
  reason: string;
};

export type ConfidenceEvolutionEntry = {
  timestamp: string;
  baseConfidence: number;
  adaptedConfidence: number;
  reason: string;
};

export type SeverityEvolution = {
  history: SeverityEvolutionEntry[];
  trend: "escalating" | "de-escalating" | "stable";
  latestSeverity: PatternSeverity;
};

export type ConfidenceEvolution = {
  history: ConfidenceEvolutionEntry[];
  trend: "strengthening" | "weakening" | "stable";
  latestConfidence: number;
};

// ─── Operational Urgency ──────────────────────────────────────────────────────

export type OperationalUrgency = "critical" | "high" | "moderate" | "low" | "informational";

// ─── Adaptive Scoring Result ──────────────────────────────────────────────────

export type AdaptiveScoringResult = {
  patternId: string;
  workspaceId: string;
  projectId: string | null;
  patternType: LearnedPatternType;

  // Adapted scores
  adaptedSeverity: PatternSeverity;
  adaptedConfidence: number;
  operationalUrgency: OperationalUrgency;
  /** 0..1 — deterministic estimate of how likely this pattern will escalate */
  escalationLikelihood: number;

  // Profiles
  severityProfile: AdaptiveSeverityProfile;
  confidenceProfile: AdaptiveConfidenceProfile;
  contradictionProfile: ContradictionProfile;
  recoveryProfile: RecoveryProfile;
  recurrenceAmplifier: RecurrenceAmplifier;
  escalationAmplifier: EscalationAmplifier;

  // Explainability
  severityExplanation: string[];
  confidenceExplanation: string[];
  operationalSummary: string;

  computedAt: string;
};

// ─── Adaptive Operational Context ────────────────────────────────────────────

export type AdaptiveOperationalContext = {
  workspaceId: string;
  projectId: string | null;
  generatedAt: string;

  // All computed results, ranked by operational urgency then severity
  adaptiveScoringResults: AdaptiveScoringResult[];

  // Categorized views
  activeChronicRisks: AdaptiveScoringResult[];
  risingEscalations: AdaptiveScoringResult[];
  weakeningSignals: AdaptiveScoringResult[];
  recoveryTrajectories: AdaptiveScoringResult[];
  unresolvedDependencies: AdaptiveScoringResult[];
  governanceDegradation: AdaptiveScoringResult[];

  // Aggregate metrics
  totalContradictionCount: number;
  totalRecoveryCount: number;
  highConfidencePatternCount: number;
  confidenceShiftCount: number;
  severityAmplificationCount: number;
  severitySuppressionCount: number;

  // Readiness
  operationalReadiness: "stable" | "at_risk" | "critical" | "recovering";
  topUrgencyRank: OperationalUrgency;
};

// ─── Scoring Input ────────────────────────────────────────────────────────────

export type AdaptiveScoringInput = {
  workspaceId: string;
  projectId: string | null;
};
