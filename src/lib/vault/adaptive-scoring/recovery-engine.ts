/**
 * Recovery-Aware Scoring Engine.
 *
 * Detects recovery signals that appeared after a pattern's firstSeenAt
 * and computes their suppressive influence on severity and urgency.
 *
 * Recovery reduces severity and urgency GRADUALLY — operational scars
 * persist temporarily. Historical evidence is never erased.
 *
 * Deterministic. No AI. All computations are rule-based and reproducible.
 */

import type { VaultNutrient } from "../digestive/types";
import type { VaultLearnedPattern } from "../learned-patterns/types";
import type { RecoveryProfile } from "./types";

// Recovery half-life: recoveryStrength decays after 14 days with no new recovery signals
const RECOVERY_HALF_LIFE_DAYS = 14;

/**
 * Computes the recovery profile for a pattern by examining recovery_signal
 * nutrients that appeared AFTER the pattern's firstSeenAt in the same scope.
 *
 * Recovery is only credited for signals that post-date the pattern's first
 * appearance (i.e., the recovery must actually follow the pattern).
 */
export function computeRecoveryProfile(
  pattern: VaultLearnedPattern,
  scopedNutrients: VaultNutrient[],
): RecoveryProfile {
  const now = Date.now();
  const patternFirstSeen = Date.parse(pattern.firstSeenAt);

  const recoveryNutrients = scopedNutrients.filter(
    (n) =>
      n.nutrientType === "recovery_signal" &&
      Date.parse(n.createdAt) > patternFirstSeen,
  );

  if (recoveryNutrients.length === 0) {
    return {
      recoveryDetected: false,
      recoveryCount: 0,
      recoveryStrength: 0,
      severitySuppression: 0,
      urgencyReduction: 0,
      operationalMemoryPreserved: true,
      description: "No recovery signals detected after pattern onset.",
      latestRecoveryAt: null,
    };
  }

  const timestamps = recoveryNutrients
    .map((n) => Date.parse(n.createdAt))
    .filter((t) => !isNaN(t));

  const latestRecoveryMs = Math.max(...timestamps);
  const daysSinceRecovery = Math.max(0, (now - latestRecoveryMs) / 86_400_000);

  // Base strength: increases with more recovery signals, capped at 1.0
  const countFactor = Math.min(1.0, recoveryNutrients.length / 3);

  // Recency factor: exponential decay from latest recovery event
  const recencyFactor = Math.pow(0.5, daysSinceRecovery / RECOVERY_HALF_LIFE_DAYS);

  // Average recovery confidence
  const avgConfidence =
    recoveryNutrients.reduce((s, n) => s + n.scoring.confidence, 0) /
    recoveryNutrients.length;

  const recoveryStrength = Math.round(
    Math.min(1.0, countFactor * recencyFactor * (0.7 + avgConfidence * 0.3)) * 100,
  ) / 100;

  // Severity suppression: recovery reduces severity rank by up to 1.0 step
  const severitySuppression = Math.round(recoveryStrength * 1.0 * 100) / 100;

  // Urgency reduction: recovery reduces operational urgency by up to 60%
  const urgencyReduction = Math.round(recoveryStrength * 0.6 * 100) / 100;

  const latestRecoveryAt = new Date(latestRecoveryMs).toISOString();

  const descriptions: string[] = [
    `${recoveryNutrients.length} recovery signal(s) detected after pattern onset.`,
    `Latest recovery: ${latestRecoveryAt.slice(0, 10)}, ${Math.round(daysSinceRecovery)} days ago.`,
    `Recovery strength: ${(recoveryStrength * 100).toFixed(0)}% — severity reduced by ${severitySuppression.toFixed(2)} rank(s).`,
    "Operational memory preserved: historical evidence remains intact.",
  ];

  return {
    recoveryDetected: true,
    recoveryCount: recoveryNutrients.length,
    recoveryStrength,
    severitySuppression,
    urgencyReduction,
    operationalMemoryPreserved: true,
    description: descriptions.join(" "),
    latestRecoveryAt,
  };
}
