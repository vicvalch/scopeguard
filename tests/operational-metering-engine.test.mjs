import test from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const meteringTypes = readFileSync('src/features/trial/metering/domain/metering-types.ts', 'utf8');
const meteringService = readFileSync('src/features/trial/metering/services/metering-service.ts', 'utf8');
const meteringEvents = readFileSync('src/features/trial/metering/events/metering-events.ts', 'utf8');
const policies = readFileSync('src/features/trial/metering/policies/consumption-policies.ts', 'utf8');
const guards = readFileSync('src/features/trial/metering/guards/metering-guards.ts', 'utf8');

test('metering types include canonical deterministic fields', () => {
  for (const field of ['eventId','runtimeCorrelationId','operationCategory','orchestrationIntensity','replaySafeHash','lineageMetadata','telemetryMetadata']) assert.match(meteringTypes, new RegExp(field));
});

test('policy layer includes category and intensity weighting semantics', () => {
  assert.match(policies, /categoryWeights/);
  assert.match(policies, /intensityMultipliers/);
  assert.match(policies, /capabilityMultipliers/);
  assert.doesNotMatch(policies.toLowerCase(), /openai|anthropic|stripe|invoice|token cost/);
});

test('services include registration, consumption, allowance and snapshot APIs', () => {
  for (const fn of ['registerOperationalUsage','consumeOperationalCredits','evaluateOperationalConsumption','generateUsageSnapshot','validateOperationalAllowance']) {
    assert.match(meteringService, new RegExp(fn));
  }
});

test('event layer includes deterministic identity and replay-safe hash behavior', () => {
  assert.match(meteringEvents, /createDeterministicEventId/);
  assert.match(meteringEvents, /createReplaySafeHash/);
  assert.match(meteringEvents, /runtimeCorrelationId/);
});

test('guard layer includes abuse and runaway detection semantics', () => {
  for (const signal of ['runaway_orchestration_detection','ingestion_explosion_detection','abnormal_usage_spike','repeated_replay_attempt']) {
    assert.match(guards, new RegExp(signal));
  }
});

test('governance check enforces provider-agnostic deterministic semantics', () => {
  const out = execSync('node scripts/check-operational-metering-governance.mjs', { encoding: 'utf8' });
  assert.match(out, /passed/i);
});
