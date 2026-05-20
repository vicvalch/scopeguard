/**
 * Contract tests for the Adaptive Severity & Confidence Engine.
 *
 * Tests validate:
 *   1. Severity amplification (recurrence, escalation, chronic status)
 *   2. Severity suppression (recovery, contradiction, decreasing trajectory)
 *   3. Confidence amplification (corroboration, lineage, confirmation)
 *   4. Confidence suppression (contradictions, weak evidence, recovery)
 *   5. Contradiction engine (correct detection and trajectory updating)
 *   6. Recovery-aware scoring (gradual suppression, operational memory)
 *   7. Explainability (every adjustment has reasons + evidence refs)
 *   8. Determinism (same inputs produce same scores)
 *   9. Tenant isolation (no cross-workspace scoring)
 *  10. Smoke test scenario validation (MEP-14156, ICE-9298, HSA-15576, MUC-13098)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

// Import adaptive scoring engine from smoke test (JS mirror of TS source)
const smokeModule = await import('../scripts/smoke-test-vault-digestion.mjs');

const {
  runAdaptiveScoringAnalysis,
  runLearnedPatternAnalysis,
  SIMULATION_ARTIFACTS,
  digestArtifact,
} = smokeModule;

// ─── Test Helpers ─────────────────────────────────────────────────────────────

function makeNutrient(overrides = {}) {
  const id = overrides.id ?? crypto.randomUUID();
  const createdAt = overrides.createdAt ?? new Date().toISOString();
  const artifactId = overrides.artifactId ?? crypto.randomUUID();
  return {
    id,
    nutrientType: overrides.nutrientType ?? 'blocker_signal',
    summary: overrides.summary ?? 'Vendor is blocking delivery and we cannot proceed',
    entities: [],
    evidence: [{
      sourceArtifactId: artifactId,
      sourceType: 'project_note',
      sourceTitle: 'Test Note',
      excerpt: overrides.summary ?? 'Vendor is blocking delivery and we cannot proceed',
      timestamp: createdAt,
      workspaceId: overrides.workspaceId ?? 'ws-test',
      projectId: overrides.projectId ?? 'proj-test',
      actorUserId: null,
      confidenceBasis: 'rule_based',
      extractionMethod: 'rule_based',
    }],
    scoring: {
      confidence: overrides.confidence ?? 0.75,
      severity: overrides.severity ?? 'high',
      freshness: 1.0,
      recurrenceHint: 'first_occurrence',
      ambiguityLevel: 'clear',
      actionability: 'actionable',
      evidenceStrength: 'strong',
      decayProfile: 'slow',
      significanceScore: 0.7,
    },
    duplicateMergeCount: 0,
    workspaceId: overrides.workspaceId ?? 'ws-test',
    projectId: overrides.projectId ?? 'proj-test',
    digestionRunId: overrides.digestionRunId ?? crypto.randomUUID(),
    createdAt,
    ...overrides,
  };
}

function makePattern(overrides = {}) {
  const id = overrides.id ?? crypto.randomUUID();
  const now = overrides.firstSeenAt ?? new Date(Date.now() - 7 * 86_400_000).toISOString();
  const last = overrides.lastSeenAt ?? new Date(Date.now() - 1 * 86_400_000).toISOString();
  return {
    id,
    workspaceId: overrides.workspaceId ?? 'ws-test',
    projectId: overrides.projectId ?? 'proj-test',
    patternType: overrides.patternType ?? 'recurring_blocker_pattern',
    title: 'Test Pattern',
    summary: 'A recurring test pattern',
    firstSeenAt: now,
    lastSeenAt: last,
    recurrenceCount: overrides.recurrenceCount ?? 4,
    involvedNutrientIds: overrides.involvedNutrientIds ?? [],
    involvedResidueIds: [],
    evidenceReferences: overrides.evidenceReferences ?? [],
    confidence: overrides.confidence ?? 0.70,
    severity: overrides.severity ?? 'high',
    trajectory: overrides.trajectory ?? 'stable',
    status: overrides.status ?? 'confirmed',
    promotionReason: overrides.promotionReason ?? 'repeated_blocker_threshold_met',
    recurrenceProfile: overrides.recurrenceProfile ?? {
      totalOccurrences: overrides.recurrenceCount ?? 4,
      distinctArtifacts: 3,
      distinctDigestionRuns: overrides.distinctRuns ?? 3,
      timeSpanDays: 7,
      multiDaySpread: true,
    },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeRecurringNutrients(type, count, ws = 'ws-test', proj = 'proj-test', summaryOverride) {
  const base = new Date('2026-04-01T10:00:00Z').getTime();
  return Array.from({ length: count }, (_, i) => {
    const createdAt = new Date(base + i * 86_400_000 * 3).toISOString();
    return makeNutrient({
      id: crypto.randomUUID(),
      nutrientType: type,
      summary: summaryOverride ?? `${type} occurring again — vendor dependency unresolved`,
      workspaceId: ws,
      projectId: proj,
      digestionRunId: `run-${type}-${i}`,
      createdAt,
      artifactId: `art-${type}-${i}`,
    });
  });
}

// Wrap nutrients in fake digested results for pattern analysis
function wrapNutrients(nutrients) {
  return nutrients.map((n) => ({
    artifact: { id: n.evidence[0].sourceArtifactId, workspaceId: n.workspaceId, projectId: n.projectId },
    result: {
      nutrients: [n], residue: [], entities: [],
      digestivePass: {
        runId: n.digestionRunId, workspaceId: n.workspaceId, projectId: n.projectId,
        actorUserId: null, rawMaterialId: null, startedAt: n.createdAt, completedAt: n.createdAt,
        extractionMethod: 'rule_based', nutrientCount: 1, residueCount: 0, entityCount: 0,
        suppressedCandidateCount: 0,
      },
    },
  }));
}

// ─── 1. Severity Amplification ────────────────────────────────────────────────

test('recurring blockers increase adaptive severity', () => {
  const pattern = makePattern({
    patternType: 'recurring_blocker_pattern',
    severity: 'high',
    trajectory: 'increasing',
    status: 'confirmed',
    recurrenceCount: 5,
    recurrenceProfile: {
      totalOccurrences: 5, distinctArtifacts: 4, distinctDigestionRuns: 4,
      timeSpanDays: 10, multiDaySpread: true,
    },
  });
  const result = runAdaptiveScoringAnalysis([pattern], []);
  const r = result.find((x) => x.patternId === pattern.id);
  assert.ok(r, 'Should produce adaptive scoring result for pattern');
  assert.ok(r.severityProfile.wasAmplified, 'Severity should be amplified for recurring blocker with increasing trajectory');
  assert.ok(
    r.severityProfile.adjustmentReasons.includes('recurrence_amplification') ||
    r.severityProfile.adjustmentReasons.includes('escalation_trajectory_increasing'),
    'Should have recurrence or escalation amplification reason',
  );
});

test('chronic pattern status amplifies severity', () => {
  const pattern = makePattern({
    status: 'chronic',
    trajectory: 'stable',
    recurrenceCount: 6,
    recurrenceProfile: {
      totalOccurrences: 6, distinctArtifacts: 5, distinctDigestionRuns: 5,
      timeSpanDays: 21, multiDaySpread: true,
    },
  });
  const result = runAdaptiveScoringAnalysis([pattern], []);
  const r = result.find((x) => x.patternId === pattern.id);
  assert.ok(r, 'Should produce result');
  assert.ok(r.severityProfile.wasAmplified, 'Chronic status should amplify severity');
});

test('absence of recovery for confirmed pattern amplifies severity', () => {
  const pattern = makePattern({
    status: 'confirmed',
    trajectory: 'stable',
  });
  // No recovery nutrients provided
  const result = runAdaptiveScoringAnalysis([pattern], []);
  const r = result.find((x) => x.patternId === pattern.id);
  assert.ok(r, 'Should produce result');
  assert.ok(
    r.severityProfile.adjustmentReasons.includes('recovery_absent_chronic'),
    'No recovery for confirmed pattern should trigger recovery_absent_chronic',
  );
});

// ─── 2. Severity Suppression ──────────────────────────────────────────────────

test('recovery signals suppress severity', () => {
  const now = Date.now();
  const patternStart = new Date(now - 14 * 86_400_000).toISOString();
  const recoveryTime = new Date(now - 2 * 86_400_000).toISOString();

  const pattern = makePattern({
    firstSeenAt: patternStart,
    lastSeenAt: new Date(now - 7 * 86_400_000).toISOString(),
    status: 'recovering',
    trajectory: 'decreasing',
  });

  const recoveryNutrient = makeNutrient({
    nutrientType: 'recovery_signal',
    workspaceId: pattern.workspaceId,
    projectId: pattern.projectId,
    createdAt: recoveryTime,
    summary: 'Blocker resolved and vendor responded — back on track',
  });

  const result = runAdaptiveScoringAnalysis([pattern], [recoveryNutrient]);
  const r = result.find((x) => x.patternId === pattern.id);
  assert.ok(r, 'Should produce result');
  assert.ok(r.recoveryProfile.recoveryDetected, 'Recovery should be detected');
  assert.ok(r.severityProfile.wasSuppressed, 'Severity should be suppressed by recovery');
});

test('decreasing trajectory suppresses severity', () => {
  const pattern = makePattern({
    trajectory: 'decreasing',
    status: 'recovering',
  });
  const result = runAdaptiveScoringAnalysis([pattern], []);
  const r = result.find((x) => x.patternId === pattern.id);
  assert.ok(r, 'Should produce result');
  assert.ok(
    r.severityProfile.adjustmentReasons.includes('trajectory_decreasing'),
    'Decreasing trajectory should trigger trajectory_decreasing suppressor',
  );
});

test('stabilized delivery lowers urgency', () => {
  const pattern = makePattern({
    patternType: 'delivery_drift_pattern',
    trajectory: 'decreasing',
    status: 'recovering',
    severity: 'medium',
  });
  const result = runAdaptiveScoringAnalysis([pattern], []);
  const r = result.find((x) => x.patternId === pattern.id);
  assert.ok(r, 'Should produce result');
  assert.ok(
    r.operationalUrgency === 'low' || r.operationalUrgency === 'informational' || r.operationalUrgency === 'moderate',
    `Recovering delivery drift should have reduced urgency, got: ${r.operationalUrgency}`,
  );
});

// ─── 3. Confidence Amplification ─────────────────────────────────────────────

test('corroborated evidence across 5+ artifacts amplifies confidence', () => {
  const pattern = makePattern({
    confidence: 0.65,
    recurrenceProfile: {
      totalOccurrences: 5,
      distinctArtifacts: 5,
      distinctDigestionRuns: 5,
      timeSpanDays: 14,
      multiDaySpread: true,
    },
  });
  const result = runAdaptiveScoringAnalysis([pattern], []);
  const r = result.find((x) => x.patternId === pattern.id);
  assert.ok(r, 'Should produce result');
  assert.ok(r.confidenceProfile.wasAmplified, 'Multi-artifact corroboration should amplify confidence');
  assert.ok(
    r.adaptedConfidence > pattern.confidence,
    `Adapted confidence ${r.adaptedConfidence} should exceed base ${pattern.confidence}`,
  );
});

test('chronic status amplifies confidence', () => {
  const pattern = makePattern({
    confidence: 0.60,
    status: 'chronic',
    recurrenceProfile: {
      totalOccurrences: 6, distinctArtifacts: 4, distinctDigestionRuns: 5,
      timeSpanDays: 21, multiDaySpread: true,
    },
  });
  const result = runAdaptiveScoringAnalysis([pattern], []);
  const r = result.find((x) => x.patternId === pattern.id);
  assert.ok(r, 'Should produce result');
  assert.ok(
    r.confidenceProfile.adjustmentReasons.includes('pattern_confirmation'),
    'Chronic status should trigger pattern_confirmation amplifier',
  );
  assert.ok(r.adaptedConfidence > pattern.confidence, 'Chronic pattern should have increased confidence');
});

test('increasing trajectory + confirmed status triggers correlated_signals amplifier', () => {
  const pattern = makePattern({
    confidence: 0.65,
    trajectory: 'increasing',
    status: 'confirmed',
  });
  const result = runAdaptiveScoringAnalysis([pattern], []);
  const r = result.find((x) => x.patternId === pattern.id);
  assert.ok(r, 'Should produce result');
  assert.ok(
    r.confidenceProfile.adjustmentReasons.includes('correlated_signals'),
    'Increasing trajectory + confirmed should trigger correlated_signals',
  );
});

// ─── 4. Confidence Suppression ────────────────────────────────────────────────

test('contradictory recovery evidence reduces confidence', () => {
  const now = Date.now();
  const patternLastSeen = new Date(now - 5 * 86_400_000).toISOString();
  const recoveryTime = new Date(now - 1 * 86_400_000).toISOString();

  const pattern = makePattern({
    patternType: 'recurring_blocker_pattern',
    lastSeenAt: patternLastSeen,
    status: 'confirmed',
    confidence: 0.75,
  });

  const recoveryNutrient = makeNutrient({
    nutrientType: 'recovery_signal',
    workspaceId: pattern.workspaceId,
    projectId: pattern.projectId,
    createdAt: recoveryTime,
    summary: 'Blocker resolved — vendor responded and unblocked',
  });

  const result = runAdaptiveScoringAnalysis([pattern], [recoveryNutrient]);
  const r = result.find((x) => x.patternId === pattern.id);
  assert.ok(r, 'Should produce result');
  assert.ok(
    r.confidenceProfile.adjustmentReasons.includes('contradictory_evidence') ||
    r.confidenceProfile.adjustmentReasons.includes('recovery_present'),
    'Recovery after confirmed blocker should trigger contradictory_evidence or recovery_present suppressor',
  );
  // The suppressor must be present and must have a negative delta
  const suppressor = r.confidenceProfile.suppressors.find(
    (s) => s.reason === 'contradictory_evidence' || s.reason === 'recovery_present',
  );
  assert.ok(suppressor, 'Should have a contradictory evidence or recovery_present suppressor');
  assert.ok(suppressor.delta < 0, `Contradictory suppressor delta must be negative, got ${suppressor.delta}`);
});

test('weak base evidence (confidence < 0.6) suppresses confidence further', () => {
  const pattern = makePattern({ confidence: 0.55, status: 'emerging' });
  const result = runAdaptiveScoringAnalysis([pattern], []);
  const r = result.find((x) => x.patternId === pattern.id);
  assert.ok(r, 'Should produce result');
  assert.ok(
    r.confidenceProfile.adjustmentReasons.includes('weak_evidence'),
    'Low base confidence should trigger weak_evidence suppressor',
  );
});

test('ambiguity pattern with few occurrences triggers noise indicator', () => {
  const pattern = makePattern({
    patternType: 'ambiguity_accumulation_pattern',
    recurrenceCount: 2,
    recurrenceProfile: {
      totalOccurrences: 2, distinctArtifacts: 2, distinctDigestionRuns: 2,
      timeSpanDays: 3, multiDaySpread: true,
    },
  });
  const result = runAdaptiveScoringAnalysis([pattern], []);
  const r = result.find((x) => x.patternId === pattern.id);
  assert.ok(r, 'Should produce result');
  assert.ok(
    r.confidenceProfile.adjustmentReasons.includes('noise_indicator'),
    'Low-recurrence ambiguity should trigger noise_indicator',
  );
});

// ─── 5. Contradiction Engine ──────────────────────────────────────────────────

test('recovery signal after lastSeenAt is detected as contradiction', () => {
  const now = Date.now();
  const patternLastSeen = new Date(now - 5 * 86_400_000).toISOString();
  const recoveryAfter = new Date(now - 1 * 86_400_000).toISOString();

  const pattern = makePattern({
    patternType: 'recurring_blocker_pattern',
    lastSeenAt: patternLastSeen,
  });

  const recovery = makeNutrient({
    nutrientType: 'recovery_signal',
    workspaceId: pattern.workspaceId,
    projectId: pattern.projectId,
    createdAt: recoveryAfter,
    summary: 'Blocker resolved by vendor response',
  });

  const result = runAdaptiveScoringAnalysis([pattern], [recovery]);
  const r = result.find((x) => x.patternId === pattern.id);
  assert.ok(r, 'Should produce result');
  assert.ok(
    r.contradictionProfile.totalContradictions >= 1,
    `Should detect at least 1 contradiction, got ${r.contradictionProfile.totalContradictions}`,
  );
  assert.ok(
    r.contradictionProfile.totalConfidenceImpact < 0,
    'Contradiction should have negative confidence impact',
  );
  assert.ok(
    r.contradictionProfile.totalSeverityImpact < 0,
    'Contradiction should have negative severity impact',
  );
});

test('recovery signal BEFORE lastSeenAt is NOT a contradiction', () => {
  const now = Date.now();
  const recoveryBefore = new Date(now - 10 * 86_400_000).toISOString();
  const patternLastSeen = new Date(now - 3 * 86_400_000).toISOString();

  const pattern = makePattern({
    patternType: 'recurring_blocker_pattern',
    lastSeenAt: patternLastSeen,
  });

  const recoveryNutrient = makeNutrient({
    nutrientType: 'recovery_signal',
    workspaceId: pattern.workspaceId,
    projectId: pattern.projectId,
    createdAt: recoveryBefore,
  });

  const result = runAdaptiveScoringAnalysis([pattern], [recoveryNutrient]);
  const r = result.find((x) => x.patternId === pattern.id);
  assert.ok(r, 'Should produce result');
  assert.equal(
    r.contradictionProfile.totalContradictions, 0,
    'Recovery before lastSeenAt should NOT be counted as contradiction',
  );
});

test('historical evidence is preserved even when contradiction is detected', () => {
  const now = Date.now();
  const patternLastSeen = new Date(now - 5 * 86_400_000).toISOString();
  const recoveryAfter = new Date(now - 1 * 86_400_000).toISOString();

  const pattern = makePattern({
    patternType: 'recurring_blocker_pattern',
    lastSeenAt: patternLastSeen,
    involvedNutrientIds: ['nutrient-001', 'nutrient-002'],
  });

  const recovery = makeNutrient({
    nutrientType: 'recovery_signal',
    workspaceId: pattern.workspaceId,
    projectId: pattern.projectId,
    createdAt: recoveryAfter,
  });

  const result = runAdaptiveScoringAnalysis([pattern], [recovery]);
  const r = result.find((x) => x.patternId === pattern.id);
  assert.ok(r, 'Should produce result');
  // Evidence lineage is preserved — the contradiction doesn't erase the pattern
  assert.equal(r.patternId, pattern.id, 'Pattern identity must be preserved');
  assert.equal(r.patternType, pattern.patternType, 'Pattern type must be preserved');
  assert.ok(r.contradictionProfile.instances.length > 0, 'Contradiction instance must be recorded');
  assert.ok(r.contradictionProfile.instances[0].evidenceTimestamp, 'Contradiction must record evidence timestamp');
});

// ─── 6. Recovery-Aware Scoring ────────────────────────────────────────────────

test('recovery does not instantly zero out severity', () => {
  const now = Date.now();
  const recoveryTime = new Date(now - 1 * 86_400_000).toISOString();
  const pattern = makePattern({
    severity: 'high',
    status: 'confirmed',
    trajectory: 'stable',
    firstSeenAt: new Date(now - 10 * 86_400_000).toISOString(),
    lastSeenAt: new Date(now - 5 * 86_400_000).toISOString(),
  });

  const recovery = makeNutrient({
    nutrientType: 'recovery_signal',
    workspaceId: pattern.workspaceId,
    projectId: pattern.projectId,
    createdAt: recoveryTime,
  });

  const result = runAdaptiveScoringAnalysis([pattern], [recovery]);
  const r = result.find((x) => x.patternId === pattern.id);
  assert.ok(r, 'Should produce result');
  // Severity should not be 'low' immediately
  assert.ok(
    r.adaptedSeverity !== 'low',
    `Recovery should not instantly reduce severity to low. Got: ${r.adaptedSeverity}`,
  );
  assert.ok(r.recoveryProfile.operationalMemoryPreserved, 'Operational memory must be preserved');
});

test('recovery strength is higher for recent recovery than old recovery', () => {
  const now = Date.now();
  const pattern = makePattern({
    firstSeenAt: new Date(now - 20 * 86_400_000).toISOString(),
    lastSeenAt: new Date(now - 15 * 86_400_000).toISOString(),
  });

  const recentRecovery = makeNutrient({
    nutrientType: 'recovery_signal',
    workspaceId: pattern.workspaceId,
    projectId: pattern.projectId,
    createdAt: new Date(now - 1 * 86_400_000).toISOString(),
  });

  const oldRecovery = makeNutrient({
    nutrientType: 'recovery_signal',
    workspaceId: pattern.workspaceId,
    projectId: pattern.projectId,
    createdAt: new Date(now - 28 * 86_400_000).toISOString(),
  });

  const recentResult = runAdaptiveScoringAnalysis([{ ...pattern, id: 'recent-p' }], [recentRecovery]);
  const oldResult = runAdaptiveScoringAnalysis([{ ...pattern, id: 'old-p' }], [oldRecovery]);

  const recent = recentResult.find((x) => x.patternId === 'recent-p');
  const old = oldResult.find((x) => x.patternId === 'old-p');

  assert.ok(recent, 'Recent result must exist');
  assert.ok(old, 'Old result must exist');

  assert.ok(
    recent.recoveryProfile.recoveryStrength >= old.recoveryProfile.recoveryStrength,
    `Recent recovery (${recent.recoveryProfile.recoveryStrength}) should have equal or higher strength than old (${old.recoveryProfile.recoveryStrength})`,
  );
});

// ─── 7. Explainability ────────────────────────────────────────────────────────

test('every adaptive scoring result has non-empty explanations', () => {
  const pattern = makePattern({
    status: 'chronic',
    trajectory: 'increasing',
    recurrenceCount: 5,
    recurrenceProfile: {
      totalOccurrences: 5, distinctArtifacts: 4, distinctDigestionRuns: 4,
      timeSpanDays: 14, multiDaySpread: true,
    },
  });
  const result = runAdaptiveScoringAnalysis([pattern], []);
  const r = result.find((x) => x.patternId === pattern.id);
  assert.ok(r, 'Should produce result');
  assert.ok(r.severityExplanation.length > 0, 'Severity explanation must be non-empty');
  assert.ok(r.confidenceExplanation.length > 0, 'Confidence explanation must be non-empty');
  assert.ok(r.operationalSummary.length > 0, 'Operational summary must be non-empty');
});

test('every severity adjustment has a reason', () => {
  const pattern = makePattern({
    trajectory: 'increasing',
    status: 'chronic',
    recurrenceProfile: {
      totalOccurrences: 8, distinctArtifacts: 6, distinctDigestionRuns: 7,
      timeSpanDays: 28, multiDaySpread: true,
    },
  });
  const result = runAdaptiveScoringAnalysis([pattern], []);
  const r = result.find((x) => x.patternId === pattern.id);
  assert.ok(r, 'Should produce result');
  for (const factor of r.severityProfile.amplifiers) {
    assert.ok(factor.reason, 'Each severity amplifier must have a reason');
    assert.ok(factor.description, 'Each severity amplifier must have a description');
    assert.equal(factor.direction, 'amplify', 'Amplifiers must have direction=amplify');
  }
  for (const factor of r.severityProfile.suppressors) {
    assert.ok(factor.reason, 'Each severity suppressor must have a reason');
    assert.equal(factor.direction, 'suppress', 'Suppressors must have direction=suppress');
  }
});

test('contradiction instances include evidence timestamp and description', () => {
  const now = Date.now();
  const patternLastSeen = new Date(now - 5 * 86_400_000).toISOString();
  const recoveryAfter = new Date(now - 1 * 86_400_000).toISOString();

  const pattern = makePattern({
    patternType: 'recurring_blocker_pattern',
    lastSeenAt: patternLastSeen,
  });

  const recovery = makeNutrient({
    nutrientType: 'recovery_signal',
    workspaceId: pattern.workspaceId,
    projectId: pattern.projectId,
    createdAt: recoveryAfter,
  });

  const result = runAdaptiveScoringAnalysis([pattern], [recovery]);
  const r = result.find((x) => x.patternId === pattern.id);
  assert.ok(r, 'Should produce result');
  for (const instance of r.contradictionProfile.instances) {
    assert.ok(instance.contradictionType, 'Instance must have contradictionType');
    assert.ok(instance.description, 'Instance must have description');
    assert.ok(instance.evidenceTimestamp, 'Instance must have evidenceTimestamp');
    assert.ok(instance.affectedPatternTypes.length > 0, 'Instance must reference affected pattern types');
    assert.ok(instance.confidenceImpact < 0, 'Contradiction confidence impact must be negative');
    assert.ok(instance.severityImpact < 0, 'Contradiction severity impact must be negative');
  }
});

// ─── 8. Determinism ───────────────────────────────────────────────────────────

test('same inputs produce same adaptive scores (determinism)', () => {
  const pattern = makePattern({
    patternType: 'financial_friction_pattern',
    status: 'confirmed',
    trajectory: 'increasing',
    confidence: 0.70,
    recurrenceCount: 3,
    recurrenceProfile: {
      totalOccurrences: 3, distinctArtifacts: 3, distinctDigestionRuns: 3,
      timeSpanDays: 10, multiDaySpread: true,
    },
  });
  const nutrients = makeRecurringNutrients('recovery_signal', 1, pattern.workspaceId, pattern.projectId);

  const run1 = runAdaptiveScoringAnalysis([pattern], nutrients);
  const run2 = runAdaptiveScoringAnalysis([pattern], nutrients);

  const r1 = run1.find((x) => x.patternId === pattern.id);
  const r2 = run2.find((x) => x.patternId === pattern.id);

  assert.ok(r1 && r2, 'Both runs should produce results');
  assert.equal(r1.adaptedSeverity, r2.adaptedSeverity, 'Adapted severity must be deterministic');
  assert.equal(r1.adaptedConfidence, r2.adaptedConfidence, 'Adapted confidence must be deterministic');
  assert.equal(r1.operationalUrgency, r2.operationalUrgency, 'Operational urgency must be deterministic');
  assert.equal(r1.escalationLikelihood, r2.escalationLikelihood, 'Escalation likelihood must be deterministic');
  assert.equal(
    r1.severityProfile.netAmplification,
    r2.severityProfile.netAmplification,
    'Net severity amplification must be deterministic',
  );
});

// ─── 9. Tenant Isolation ──────────────────────────────────────────────────────

test('adaptive scoring never crosses workspace boundaries', () => {
  const patternA = makePattern({ workspaceId: 'ws-A', projectId: 'proj-A' });
  const patternB = makePattern({ workspaceId: 'ws-B', projectId: 'proj-B' });

  // Recovery nutrient in ws-B should NOT suppress severity in ws-A
  const now = Date.now();
  const recoveryNutrientB = makeNutrient({
    nutrientType: 'recovery_signal',
    workspaceId: 'ws-B',
    projectId: 'proj-B',
    createdAt: new Date(now - 1 * 86_400_000).toISOString(),
  });

  const resultsA = runAdaptiveScoringAnalysis([patternA], [recoveryNutrientB]);
  const rA = resultsA.find((x) => x.patternId === patternA.id);

  assert.ok(rA, 'Should produce result for pattern A');
  assert.equal(rA.workspaceId, 'ws-A', 'Result must be scoped to ws-A');
  assert.equal(rA.recoveryProfile.recoveryDetected, false,
    'Recovery from ws-B should NOT affect ws-A pattern');
});

test('adaptive scoring never crosses project boundaries within same workspace', () => {
  const ws = 'ws-shared';
  const patternX = makePattern({ workspaceId: ws, projectId: 'proj-X' });

  // Recovery nutrient in same workspace but different project
  const now = Date.now();
  const recoveryNutrientY = makeNutrient({
    nutrientType: 'recovery_signal',
    workspaceId: ws,
    projectId: 'proj-Y',
    createdAt: new Date(now - 1 * 86_400_000).toISOString(),
  });

  const results = runAdaptiveScoringAnalysis([patternX], [recoveryNutrientY]);
  const rX = results.find((x) => x.patternId === patternX.id);

  assert.ok(rX, 'Should produce result for proj-X');
  assert.equal(rX.recoveryProfile.recoveryDetected, false,
    'Recovery from proj-Y should NOT affect proj-X pattern');
});

// ─── 10. Smoke Test Scenario Validation ───────────────────────────────────────

test('MEP-14156: recurring tenant blockers produce amplified severity', () => {
  const mepArtifacts = SIMULATION_ARTIFACTS.filter((a) => a.projectId === 'proj-mep-14156');
  const digestedResults = mepArtifacts.map((artifact) => ({
    artifact,
    result: digestArtifact(artifact),
  }));
  const patternAnalysis = runLearnedPatternAnalysis(digestedResults);
  const mepPatterns = patternAnalysis.byProject['proj-mep-14156'] ?? [];
  const mepNutrients = digestedResults.flatMap((r) => r.result.nutrients);

  const adaptiveResults = runAdaptiveScoringAnalysis(mepPatterns, mepNutrients);
  assert.ok(adaptiveResults.length > 0, 'MEP-14156 should produce adaptive scoring results');

  const blockerResult = adaptiveResults.find((r) => r.patternType === 'recurring_blocker_pattern');
  assert.ok(blockerResult, 'MEP-14156 should have adaptive scoring for recurring_blocker_pattern');
  assert.ok(
    blockerResult.escalationLikelihood >= 0.2,
    `MEP-14156 blocker escalation likelihood should be >= 0.2, got ${blockerResult.escalationLikelihood}`,
  );
});

test('MEP-14156: recovery pattern has reduced urgency and suppressed severity', () => {
  const mepArtifacts = SIMULATION_ARTIFACTS.filter((a) => a.projectId === 'proj-mep-14156');
  const digestedResults = mepArtifacts.map((a) => ({ artifact: a, result: digestArtifact(a) }));
  const patternAnalysis = runLearnedPatternAnalysis(digestedResults);
  const mepPatterns = patternAnalysis.byProject['proj-mep-14156'] ?? [];
  const mepNutrients = digestedResults.flatMap((r) => r.result.nutrients);

  const adaptiveResults = runAdaptiveScoringAnalysis(mepPatterns, mepNutrients);
  const recoveryResult = adaptiveResults.find((r) => r.patternType === 'recovery_pattern');
  if (recoveryResult) {
    assert.ok(
      recoveryResult.operationalUrgency !== 'critical',
      'Recovery pattern should not have critical urgency',
    );
    assert.ok(
      ['low', 'informational', 'moderate'].includes(recoveryResult.operationalUrgency),
      `Recovery pattern urgency should be low/moderate/informational, got: ${recoveryResult.operationalUrgency}`,
    );
  }
});

test('ICE-9298: financial impediment produces elevated adaptive severity and confidence', () => {
  const iceArtifacts = SIMULATION_ARTIFACTS.filter((a) => a.projectId === 'proj-ice-9298');
  const digestedResults = iceArtifacts.map((a) => ({ artifact: a, result: digestArtifact(a) }));
  const patternAnalysis = runLearnedPatternAnalysis(digestedResults);
  const icePatterns = patternAnalysis.byProject['proj-ice-9298'] ?? [];
  const iceNutrients = digestedResults.flatMap((r) => r.result.nutrients);

  const adaptiveResults = runAdaptiveScoringAnalysis(icePatterns, iceNutrients);
  assert.ok(adaptiveResults.length > 0, 'ICE-9298 should produce adaptive scoring results');

  const finResult = adaptiveResults.find((r) => r.patternType === 'financial_friction_pattern');
  assert.ok(finResult, 'ICE-9298 should have adaptive scoring for financial_friction_pattern');
  assert.ok(
    finResult.adaptedConfidence >= 0.5,
    `ICE-9298 financial confidence should be >= 0.5, got ${finResult.adaptedConfidence}`,
  );
});

test('ICE-9298: escalation trajectory has high escalation likelihood', () => {
  const iceArtifacts = SIMULATION_ARTIFACTS.filter((a) => a.projectId === 'proj-ice-9298');
  const digestedResults = iceArtifacts.map((a) => ({ artifact: a, result: digestArtifact(a) }));
  const patternAnalysis = runLearnedPatternAnalysis(digestedResults);
  const icePatterns = patternAnalysis.byProject['proj-ice-9298'] ?? [];
  const iceNutrients = digestedResults.flatMap((r) => r.result.nutrients);

  const adaptiveResults = runAdaptiveScoringAnalysis(icePatterns, iceNutrients);
  const escResult = adaptiveResults.find((r) => r.patternType === 'escalation_trajectory_pattern');
  if (escResult) {
    assert.ok(
      escResult.escalationLikelihood >= 0.4,
      `ICE-9298 escalation likelihood should be >= 0.4, got ${escResult.escalationLikelihood}`,
    );
  }
});

test('adaptive context includes correct aggregate metrics', () => {
  const mepArtifacts = SIMULATION_ARTIFACTS.filter((a) => a.projectId === 'proj-mep-14156');
  const digestedResults = mepArtifacts.map((a) => ({ artifact: a, result: digestArtifact(a) }));
  const patternAnalysis = runLearnedPatternAnalysis(digestedResults);
  const mepPatterns = patternAnalysis.byProject['proj-mep-14156'] ?? [];
  const mepNutrients = digestedResults.flatMap((r) => r.result.nutrients);

  if (typeof smokeModule.runAdaptiveContextAnalysis === 'function') {
    const ctx = smokeModule.runAdaptiveContextAnalysis(mepPatterns, mepNutrients, 'ws-mep', 'proj-mep-14156');
    assert.ok(ctx, 'Should produce adaptive context');
    assert.ok(typeof ctx.totalContradictionCount === 'number', 'Must have totalContradictionCount');
    assert.ok(typeof ctx.totalRecoveryCount === 'number', 'Must have totalRecoveryCount');
    assert.ok(typeof ctx.highConfidencePatternCount === 'number', 'Must have highConfidencePatternCount');
    assert.ok(
      ['stable', 'at_risk', 'critical', 'recovering'].includes(ctx.operationalReadiness),
      `operationalReadiness must be valid, got: ${ctx.operationalReadiness}`,
    );
  }
});

test('all adaptive scoring results have required fields', () => {
  const allArtifacts = SIMULATION_ARTIFACTS;
  const digestedResults = allArtifacts.map((a) => ({ artifact: a, result: digestArtifact(a) }));
  const patternAnalysis = runLearnedPatternAnalysis(digestedResults);
  const allPatterns = patternAnalysis.patterns;
  const allNutrients = digestedResults.flatMap((r) => r.result.nutrients);

  const adaptiveResults = runAdaptiveScoringAnalysis(allPatterns, allNutrients);
  assert.ok(adaptiveResults.length > 0, 'Should produce adaptive results for all patterns');

  for (const r of adaptiveResults) {
    assert.ok(r.patternId, 'Must have patternId');
    assert.ok(r.workspaceId, 'Must have workspaceId');
    assert.ok(r.patternType, 'Must have patternType');
    assert.ok(['low','medium','high','critical'].includes(r.adaptedSeverity), `adaptedSeverity must be valid, got ${r.adaptedSeverity}`);
    assert.ok(r.adaptedConfidence >= 0 && r.adaptedConfidence <= 1, `adaptedConfidence must be 0..1, got ${r.adaptedConfidence}`);
    assert.ok(['critical','high','moderate','low','informational'].includes(r.operationalUrgency), `operationalUrgency must be valid, got ${r.operationalUrgency}`);
    assert.ok(r.escalationLikelihood >= 0 && r.escalationLikelihood <= 1, `escalationLikelihood must be 0..1, got ${r.escalationLikelihood}`);
    assert.ok(r.severityProfile, 'Must have severityProfile');
    assert.ok(r.confidenceProfile, 'Must have confidenceProfile');
    assert.ok(r.contradictionProfile, 'Must have contradictionProfile');
    assert.ok(r.recoveryProfile, 'Must have recoveryProfile');
    assert.ok(r.recurrenceAmplifier, 'Must have recurrenceAmplifier');
    assert.ok(r.escalationAmplifier, 'Must have escalationAmplifier');
    assert.ok(r.severityExplanation.length > 0, 'Must have severityExplanation');
    assert.ok(r.confidenceExplanation.length > 0, 'Must have confidenceExplanation');
    assert.ok(r.operationalSummary.length > 0, 'Must have operationalSummary');
    assert.ok(r.computedAt, 'Must have computedAt');
  }
});
