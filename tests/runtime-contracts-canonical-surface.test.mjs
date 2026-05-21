import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const runtimeContractsPath = path.join(repoRoot, "src/aoc/enterprise/runtime/runtime-contracts.ts");
const runtimeInputContractsPath = path.join(repoRoot, "src/aoc/enterprise/runtime/runtime-input-contracts.ts");
const authorityPortPath = path.join(repoRoot, "src/aoc/enterprise/runtime/authority-port.ts");

test("runtime-contracts.ts canonical surface exists", () => {
  assert.equal(existsSync(runtimeContractsPath), true);
});

test("runtime-input-contracts.ts canonical input surface exists", () => {
  assert.equal(existsSync(runtimeInputContractsPath), true);
});

test("authority-port.ts references canonical contract surfaces", () => {
  const content = readFileSync(authorityPortPath, "utf8");
  assert.match(content, /\.\/runtime-contracts/);
  assert.match(content, /\.\/runtime-input-contracts/);
});

test("runtime-contracts.ts does not depend on app/auth/security layers", () => {
  const content = readFileSync(runtimeContractsPath, "utf8");
  assert.doesNotMatch(content, /from\s+["']@\/app\//);
  assert.doesNotMatch(content, /from\s+["']@\/lib\/auth/);
  assert.doesNotMatch(content, /from\s+["']@\/lib\/security/);
});

test("runtime-input-contracts.ts does not depend on forbidden layers", () => {
  const content = readFileSync(runtimeInputContractsPath, "utf8");
  assert.doesNotMatch(content, /from\s+["']@\/app\//);
  assert.doesNotMatch(content, /from\s+["']@\/lib\/auth/);
  assert.doesNotMatch(content, /from\s+["']@\/lib\/security/);
  assert.doesNotMatch(content, /from\s+["'].\/authority-provider/);
  assert.doesNotMatch(content, /from\s+["'].\/in-process-authority-adapter/);
  assert.doesNotMatch(content, /from\s+["'].\/external-authority-adapter/);
});

test("runtime-contracts.ts uses runtime-input-contracts and not operational modules", () => {
  const content = readFileSync(runtimeContractsPath, "utf8");
  assert.match(content, /from\s+["']\.\/runtime-input-contracts["']/);
  assert.doesNotMatch(content, /from\s+["']\.\/delegated-capabilities["']/);
  assert.doesNotMatch(content, /from\s+["']\.\/execution-grants["']/);
});

test("runtime-contracts.ts exports canonical runtime contract names", () => {
  const content = readFileSync(runtimeContractsPath, "utf8");
  for (const symbol of [
    "RuntimePermission",
    "RuntimeWorkspaceRole",
    "RuntimeAuthUserContext",
    "RuntimeGovernanceEvaluationInput",
    "RuntimeEnterpriseDecision",
    "RuntimeEnforcementResult",
    "RuntimeAgentAccessInput",
    "RuntimeAgentScopeInput",
    "RuntimeAuthorityProviderKind",
    "RuntimeAuthorityProviderMetadata",
    "RuntimeAuthorityPortResult",
    "RuntimeAuthorityDependencyError",
    "RuntimeAuthorityUnavailableError",
    "InProcessAuthorityDependencies",
  ]) {
    assert.match(content, new RegExp(`\\b${symbol}\\b`));
  }
});

test("runtime-input-contracts.ts exports canonical input contract names", () => {
  const content = readFileSync(runtimeInputContractsPath, "utf8");
  for (const symbol of ["DelegationConstraints", "DelegationDecision", "DelegationInput", "ExecutionGrantInput"]) {
    assert.match(content, new RegExp(`\\b${symbol}\\b`));
  }
});

test("transitional any compatibility remains intentionally allowed", () => {
  const content = readFileSync(runtimeContractsPath, "utf8");
  assert.match(content, /TRANSITIONAL: kept intentionally broad during Runtime Contracts Extraction\./);
});
