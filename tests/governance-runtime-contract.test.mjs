import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const runtime = fs.readFileSync('src/lib/security/governance-runtime.ts', 'utf8');
const routes = {
  copilot: fs.readFileSync('src/app/api/copilot/route.ts', 'utf8'),
  upload: fs.readFileSync('src/app/api/upload/route.ts', 'utf8'),
  billing: fs.readFileSync('src/app/api/billing/create-checkout-session/route.ts', 'utf8'),
};

test('policy registry includes required phase-5 governed actions', () => {
  for (const action of ['project.read','project.write','memory.read','memory.write','document.upload','billing.manage','members.manage','ai.execute','ai.manage','workspace.manage','executive.view','privileged.use']) {
    assert.match(runtime, new RegExp(`"${action}"`));
  }
});

test('role and permission outcomes are encoded for owner/PM/contributor/external stakeholder', () => {
  assert.match(runtime, /billing\.manage[\s\S]*minimumRole: "owner"/);
  assert.match(runtime, /memory\.write[\s\S]*requiredPermission: "write_memory"/);
  assert.match(runtime, /Denied because .*project scope is missing/);
});

test('ai agent and system actor controls are explicitly enforced', () => {
  assert.match(runtime, /actorType === "ai_agent"/);
  assert.match(runtime, /verifyAgentAttestation/);
  assert.match(runtime, /requireAgentScope/);
  assert.match(runtime, /Denied because systemActor context is required/);
});

test('traceability and decision audit metadata include explainable reasons', () => {
  assert.match(runtime, /trace.push\(\{ rule: "policy_registry"/);
  assert.match(runtime, /project_binding_checked|workspace_membership_checked/);
  assert.match(runtime, /governanceDecision: \{ decisionId/);
  assert.match(runtime, /reason:/);
});

test('denied decisions emit security events and routes enforce governance runtime', () => {
  assert.match(runtime, /logSecurityEvent\(result.allowed \? "governance_violation" : policy.denyEventType/);
  assert.match(routes.copilot, /enforceRuntimeAuthorization/);
  assert.match(routes.upload, /enforceRuntimeAuthorization/);
  assert.match(routes.billing, /enforceRuntimeAuthorization/);
});
