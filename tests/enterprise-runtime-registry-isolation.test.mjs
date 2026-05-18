import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const enterpriseFiles = execFileSync("rg", ["--files", "src/aoc/enterprise"], { encoding: "utf8" })
  .trim()
  .split("\n")
  .filter(Boolean)
  .filter((file) => /\.(ts|tsx|js|mjs)$/.test(file));

test("enterprise registry access is isolated to the runtime composition root", () => {
  const violations = [];
  for (const file of enterpriseFiles) {
    const source = readFileSync(file, "utf8");
    if (source.includes("getAocAdapter(") && file !== "src/aoc/enterprise/runtime/composition.ts") {
      violations.push(file);
    }
  }

  assert.deepEqual(violations, []);
});

test("enterprise orchestration modules consume RuntimeContext explicitly", () => {
  for (const file of [
    "src/aoc/enterprise/runtime/governance-core.ts",
    "src/aoc/enterprise/runtime/execution-grants.ts",
    "src/aoc/enterprise/runtime/delegated-capabilities.ts",
  ]) {
    const source = readFileSync(file, "utf8");
    assert.match(source, /RuntimeContext/, `${file} should depend on RuntimeContext`);
    assert.doesNotMatch(source, /getAocAdapter\(/, `${file} must not fetch registry adapters directly`);
  }
});

test("runtime context exposes canonical dependency groups for orchestration", () => {
  const source = readFileSync("src/aoc/enterprise/runtime/context.ts", "utf8");
  assert.match(source, /export interface RuntimeContext/);
  assert.match(source, /RuntimeSecurityContext/);
  assert.match(source, /RuntimeGovernanceContext/);
  assert.match(source, /RuntimeCapabilityContext/);
  assert.match(source, /RuntimeAuditContext/);
});
