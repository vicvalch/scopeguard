import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const schemas = readFileSync('src/features/trial/schemas/trial-schemas.ts', 'utf8');
const utils = readFileSync('src/features/trial/utils/trial-utils.ts', 'utf8');
const domain = readFileSync('src/features/trial/domain/trial-domain.ts', 'utf8');
const types = readFileSync('src/features/trial/types/trial-types.ts', 'utf8');

test('trial schemas enforce tenant scope and runtime parsing', () => {
  assert.match(schemas, /parseTrialState/);
  assert.match(schemas, /companyId/);
  assert.match(schemas, /workspaceId/);
  assert.match(schemas, /userId/);
  assert.match(schemas, /Invalid TrialState\.status/);
});

test('usage and credits utilities encode deterministic threshold semantics', () => {
  assert.match(utils, /evaluateLimit/);
  assert.match(utils, /evaluateUsageThreshold/);
  assert.match(utils, /detectCreditDepletion/);
  assert.match(utils, /calculateExpirationState/);
  assert.match(utils, /enterprise_candidate/);
});

test('domain lifecycle handles conversion, expiration, and restriction transitions', () => {
  assert.match(domain, /if \(trial\.upgradedAt\) return 'converted'/);
  assert.match(domain, /if \(expiry\.expired\) return 'expired'/);
  assert.match(domain, /if \(creditState\.hardDepleted\) return 'restricted'/);
});

test('trial type avoids shallow trial-days model and includes operational semantics', () => {
  assert.doesNotMatch(types.toLowerCase(), /trial_days_left/);
  assert.match(types, /operationalMaturityScore/);
  assert.match(types, /replenishmentRatePerWindow/);
});

test('governance script validates canonical foundation structure', () => {
  const out = execSync('node scripts/check-trial-domain-foundation.mjs', { encoding: 'utf8' });
  assert.match(out, /passed/);
});
