# Adaptive Severity & Confidence Engine

## Why Static Scoring Is Insufficient

PMFreak's vault digestive system extracts operational signals and scores them at ingestion time. Initial scoring assigns:

- **Severity** — static baseline per nutrient type (e.g., `blocker_signal` = `high`)
- **Confidence** — based on matched pattern count and text specificity

Static scoring treats every extracted signal as if it exists in isolation. It cannot answer operational questions like:

- Has this blocker been recurring for 4 weeks without resolution?
- Has escalation language intensified since the first signal?
- Has the organization historically failed to resolve this type of issue?
- Did a recovery signal appear after an escalation that suggests the blocker may be closing?
- Are there contradictions that weaken our interpretation?

The Adaptive Severity & Confidence Engine answers these questions deterministically.

---

## System Overview

The engine operates on **`VaultLearnedPattern`** objects (the output of the Learned Pattern Layer) combined with **`VaultNutrient`** arrays (the underlying evidence). It computes:

| Output | Description |
|--------|-------------|
| `adaptedSeverity` | Adjusted severity based on longitudinal context |
| `adaptedConfidence` | Adjusted confidence based on evidence quality |
| `operationalUrgency` | Composite urgency: critical / high / moderate / low / informational |
| `escalationLikelihood` | 0–1 deterministic estimate of escalation risk |

Every adjustment is **explainable**: each amplifier and suppressor includes a human-readable description, direction, and magnitude.

---

## Adaptive Severity Evolution

### Severity Rank Model

Severity is computed as a continuous rank (1.0–4.0), then snapped to the enum:

```
1.0–1.5 → low
1.5–2.5 → medium
2.5–3.5 → high
3.5–4.0 → critical
```

Amplifiers and suppressors apply additive rank modifiers.

### Severity Amplifiers

| Amplifier | Trigger | Rank Modifier |
|-----------|---------|---------------|
| `recurrence_amplification` | ≥8 occurrences / 5+ runs | +1.00 |
| `recurrence_amplification` | ≥5 occurrences / 4+ runs | +0.75 |
| `recurrence_amplification` | ≥3 occurrences / 3+ runs | +0.50 |
| `recurrence_amplification` | ≥2 occurrences / 2+ runs | +0.25 |
| `escalation_trajectory_increasing` | trajectory = increasing | +0.50 |
| `chronic_status` | status = chronic | +0.25–0.50 |
| `recovery_absent_chronic` | no recovery + confirmed/chronic status | +0.25 |
| `governance_degradation_accumulation` | governance pattern + ≥3 occurrences | +0.25 |
| `dependency_clustering` | blocker/dependency + ≥3 runs | +0.25 |

### Severity Suppressors

| Suppressor | Trigger | Rank Modifier |
|------------|---------|---------------|
| `recovery_suppression` | recovery signals detected (strength 0–1) | −0 to −1.0 |
| `contradiction_weakening` | contradictions detected | −0.25 to −1.5 |
| `trajectory_decreasing` | trajectory = decreasing or recovered | −0.50 |
| `delivery_stabilized` | status = recovering or resolved | −0.25 |

---

## Adaptive Confidence Evolution

### Confidence Amplifiers

| Amplifier | Trigger | Confidence Delta |
|-----------|---------|-----------------|
| `evidence_consistency` | 5+ distinct artifacts | +0.15 |
| `evidence_consistency` | 3–4 distinct artifacts | +0.10 |
| `evidence_consistency` | 2 distinct artifacts | +0.05 |
| `cross_artifact_recurrence` | multiDaySpread + ≥14 days | +0.10 |
| `cross_artifact_recurrence` | multiDaySpread + 7–13 days | +0.06 |
| `cross_artifact_recurrence` | multiDaySpread only | +0.03 |
| `pattern_confirmation` | status = chronic | +0.15 |
| `pattern_confirmation` | status = confirmed | +0.10 |
| `correlated_signals` | trajectory=increasing + confirmed/chronic | +0.10 |
| `strong_lineage` | ≥5 evidence references | +0.05 |
| `cross_artifact_recurrence` | recurrence confidence boost | 0–0.30 |

### Confidence Suppressors

| Suppressor | Trigger | Confidence Delta |
|------------|---------|-----------------|
| `contradictory_evidence` | contradictions detected | −0.06 to −0.40 |
| `weak_evidence` | base confidence < 0.60 | −0.05 |
| `noise_indicator` | ambiguity pattern + <3 occurrences | −0.05 |
| `recovery_present` | recovery detected (strength 0–1) | −0 to −0.12 |
| `decay_dominance` | trajectory = decreasing or recovered | −0.06 |

---

## Contradiction Handling

The contradiction engine detects operational contradictions by looking for nutrient evidence that appeared **after a pattern's `lastSeenAt`** timestamp. Only post-pattern evidence can contradict an established pattern.

### Contradiction Types

| Type | Pattern Types | Contradicting Nutrients |
|------|--------------|------------------------|
| `blocker_resolved_after_persistent` | recurring_blocker_pattern | recovery_signal |
| `approval_completed_after_escalation` | escalation, governance | recovery_signal, decision_signal |
| `vendor_responded_after_no_response` | dependency, blocker | recovery_signal, commitment_signal |
| `timeline_stabilized_after_drift` | delivery_drift_pattern | recovery_signal, commitment_signal |
| `recovery_after_chronic` | chronic_risk, financial_friction | recovery_signal |
| `generic_resolution` | stakeholder_pressure, ambiguity | recovery_signal, decision_signal |

### Contradiction Invariants

- Contradictions **reduce** confidence and may reduce severity
- Contradictions **never erase** historical evidence or lineage
- Pattern identity and `involvedNutrientIds` are always preserved
- Up to 10 contradiction instances are recorded per pattern (capped for auditability)
- Total confidence impact capped at −0.40 to prevent over-suppression
- Total severity impact capped at −1.5 rank

---

## Recovery-Aware Cognition

Recovery strength is computed from recovery signals that appeared **after** the pattern's `firstSeenAt`:

```
countFactor = min(1.0, recoveryCount / 3)
recencyFactor = 0.5^(daysSinceRecovery / 14)  // 14-day half-life
avgConfidence = mean(recovery nutrient confidences)
recoveryStrength = countFactor × recencyFactor × (0.7 + avgConfidence × 0.3)
```

Recovery suppresses severity by `recoveryStrength × 1.0` rank and urgency by `recoveryStrength × 0.6`.

### Recovery Principles

- Severity is never instantly zeroed by recovery
- Operational memory is always preserved (`operationalMemoryPreserved: true`)
- Recovery from a different workspace or project **never** affects another scope
- Recovery strength decays over time (14-day half-life) if not reinforced

---

## Explainability Layer

Every `AdaptiveScoringResult` includes:

```typescript
severityExplanation: string[]   // Human-readable severity adjustment narrative
confidenceExplanation: string[] // Human-readable confidence adjustment narrative
operationalSummary: string      // One-paragraph operational status summary
```

Example output for a chronic blocker:

```
Severity amplified from high → critical (net: +1.00)
  + [recurrence_amplification] Severe recurrence: 8 occurrences across 5 runs — full severity step amplified.
  + [escalation_trajectory_increasing] Trajectory increasing — escalation amplified.
  + [recovery_absent_chronic] No recovery signals for confirmed pattern — absence amplifies operational risk.

Confidence strengthened: 0.70 → 0.89 (net: +0.19)
  + [evidence_consistency] 5 distinct artifacts corroborate this pattern.
  + [cross_artifact_recurrence] Signal persisted 28 days — strong temporal evidence.
  + [pattern_confirmation] Pattern status is chronic.
  + [correlated_signals] Increasing trajectory combined with chronic status.
```

---

## Persistence Model

Adaptive scoring results are persisted by extending `vault_learned_patterns` with:

| Column | Type | Description |
|--------|------|-------------|
| `adaptive_severity` | text | Adapted severity after engine computation |
| `adaptive_confidence` | numeric(4,3) | Adapted confidence 0–1 |
| `operational_urgency` | text | critical/high/moderate/low/informational |
| `escalation_likelihood` | numeric(4,3) | 0–1 escalation likelihood |
| `contradiction_count` | integer | Number of contradictions detected |
| `recovery_count` | integer | Number of recovery signals detected |
| `adaptive_scoring` | jsonb | Full `AdaptiveScoringResult` for audit trail |

All columns are nullable with safe defaults — no existing rows are broken.
Full adaptive scoring is stored in `adaptive_scoring` JSONB for complete auditability.

---

## Operational Urgency Ranking

Urgency is computed from adapted severity and confidence:

```
effective_rank = max(1, adapted_rank - recoveryStrength × 0.5)
effective_conf = max(0.05, adapted_confidence - recoveryStrength × 0.1)

critical   → effective_rank ≥ 4.0 and conf ≥ 0.7
           → effective_rank ≥ 3.5 and conf ≥ 0.5
high       → effective_rank ≥ 3.0 and conf ≥ 0.4
moderate   → effective_rank ≥ 2.5 and conf ≥ 0.5
           → effective_rank ≥ 2.0 and conf ≥ 0.55
low        → effective_rank ≥ 2.0 and conf ≥ 0.35
informational → otherwise
```

---

## Deterministic Constraints

The engine never:
- Uses LLMs or embeddings
- Introduces randomness
- Makes assumptions beyond supplied evidence
- Crosses workspace or project boundaries
- Erases historical lineage
- Instantly zeroes severity for resolved issues
- Promotes a pattern based on a single signal

The engine always:
- Produces identical output for identical inputs
- Preserves operational memory even when recovery is detected
- Scopes all computations to the `workspaceId + projectId` pair
- Includes a reason, direction, and magnitude for every adjustment
- Stores a complete audit trail in the `adaptive_scoring` JSONB column

---

## AOC/Runtime Governance Alignment

The adaptive scoring engine is a pure library layer — it has no access to authentication, runtime tokens, or capability grants. Callers (API routes, Copilot context builders, executive synthesis) must verify workspace/project access before passing patterns and nutrients to this engine.

This matches the existing governance model: authorization is performed at the boundary, not inside the cognition layer.

---

## API Reference

```typescript
// Core scoring
computeAdaptiveScoring(pattern, scopedNutrients) → AdaptiveScoringResult
computeAdaptiveScoringForProject(context, patterns, nutrients) → AdaptiveScoringResult[]

// Convenience accessors
getAdaptiveSeverity(pattern, nutrients) → AdaptiveSeverityProfile
getAdaptiveConfidence(pattern, nutrients) → AdaptiveConfidenceProfile

// Context aggregation (for Copilot, dashboards, executive synthesis)
getAdaptiveOperationalContext(context, patterns, nutrients) → AdaptiveOperationalContext

// Explainability
explainAdaptiveScoring(result) → string (formatted multi-line report)
```
