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
