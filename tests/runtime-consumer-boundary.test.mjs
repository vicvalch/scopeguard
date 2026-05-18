import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const MIGRATED_ROUTES = ["src/app/api/operational-memory/route.ts"];

test("migrated routes consume enterprise runtime authorization adapter", () => {
  for (const file of MIGRATED_ROUTES) {
    const src = readFileSync(file, "utf8");
    assert.equal(src.includes("buildEnterpriseRuntimeRequest("), true, `${file} must construct enterprise runtime request`);
    assert.equal(src.includes("authorizeRuntimeAction("), true, `${file} must call enterprise runtime authorization entrypoint`);
    assert.equal(src.includes("@/lib/security/access-guards"), false, `${file} must not import local access guards`);
    assert.equal(src.includes("evaluatePolicyDecision("), false, `${file} must not run local policy engine`);
  }
});

test("access-guards delegates authorization authority to enterprise runtime", () => {
  const src = readFileSync("src/lib/security/access-guards.ts", "utf8");
  assert.equal(src.includes("authorizeRuntimeAction"), true, "access-guards must import authorizeRuntimeAction");
  assert.equal(src.includes("buildEnterpriseRuntimeRequest"), true, "access-guards must build enterprise runtime requests");
  assert.equal(src.includes("evaluatePolicyDecision"), false, "access-guards must not import/call evaluatePolicyDecision");
  assert.equal(src.includes("defaultGovernancePolicyEvaluator"), false, "access-guards must not perform local RBAC policy evaluation");
});

test("server-authorization remains runtime-only for capability checks", () => {
  const src = readFileSync("src/lib/security/server-authorization.ts", "utf8");
  assert.equal(src.includes("authorizeRuntimeAction"), true, "server-authorization must call enterprise runtime");
  assert.equal(src.includes("buildEnterpriseRuntimeRequest"), true, "server-authorization must build runtime requests");
  assert.equal(src.includes("evaluatePolicyDecision"), false, "server-authorization must not call local policy engine");
});

test("enterprise/protocol boundaries stay clean", () => {
  const enterpriseExports = readFileSync("src/aoc/enterprise/index.ts", "utf8");
  assert.equal(/@\/lib|@\/app/.test(enterpriseExports), false, "src/aoc/enterprise must not import from app/lib aliases");

  const protocolExports = readFileSync("src/aoc/protocol/index.ts", "utf8");
  assert.equal(/@\/lib|@\/app|@\/sdk|@\/aoc\/enterprise/.test(protocolExports), false, "src/aoc/protocol must not import app/lib/sdk/enterprise aliases");
});
