import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const runtimeWrapper = fs.readFileSync('src/lib/aoc/enterprise/runtime.ts', 'utf8');
const legacyRuntime = fs.readFileSync('src/aoc/enterprise/runtime/governance-core.ts', 'utf8');

const governedRoutes = [
  'src/app/api/copilot/route.ts',
  'src/app/api/upload/route.ts',
  'src/app/api/billing/create-checkout-session/route.ts',
  'src/app/api/billing/create-portal-session/route.ts',
];

const routeSources = governedRoutes.map((file) => ({ file, source: fs.readFileSync(file, 'utf8') }));

test('runtime wrapper exposes only evaluation and enforcement entrypoints', () => {
  assert.match(runtimeWrapper, /export async function evaluateRuntimeAuthorization/);
  assert.match(runtimeWrapper, /export async function enforceRuntimeAuthorization/);
  assert.doesNotMatch(runtimeWrapper, /export\s+\{[^}]*enforceGovernanceAction/);
  assert.doesNotMatch(runtimeWrapper, /export\s+\{[^}]*evaluateGovernanceAction/);
});

test('governed product routes consume AOC runtime wrapper and avoid direct legacy runtime imports', () => {
  for (const { file, source } of routeSources) {
    assert.match(source, /enforceRuntimeAuthorization/, `${file} should enforce runtime authorization through wrapper`);
    assert.doesNotMatch(source, /security\/governance-runtime/, `${file} must not import legacy runtime directly`);
  }
});

test('governance core owns governed action policy surface', () => {
  for (const action of ['project.read', 'project.write', 'memory.read', 'memory.write', 'document.upload', 'billing.manage', 'members.manage', 'ai.execute', 'ai.manage', 'workspace.manage', 'executive.view', 'privileged.use']) {
    assert.match(legacyRuntime, new RegExp(`"${action}"`));
  }
});

test('boundary lint rejects direct governance-runtime imports outside internal allowlist', () => {
  const output = execFileSync('node', ['scripts/lint-aoc-boundaries.mjs'], { encoding: 'utf8' });
  assert.match(output, /AOC boundary lint passed/);
});

test('governance core deny path preserves denyResponse security payload contract', () => {
  assert.match(legacyRuntime, /denyResponse\(\{ status: 403/);
  assert.match(legacyRuntime, /reason: decision\.reason/);
  assert.match(legacyRuntime, /eventType: decision\.auditEventType/);
  assert.match(legacyRuntime, /actorUserId:/);
  assert.match(legacyRuntime, /actorAgentId:/);
  assert.match(legacyRuntime, /workspaceId:/);
  assert.match(legacyRuntime, /projectId:/);
});
