import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const FORBIDDEN = ["@/lib", "@/app", "@/sdk", "@/aoc/enterprise", "../../runtime/"];
const protocolFiles = execFileSync("rg", ["--files", "src/aoc/protocol"], { encoding: "utf8" })
  .trim()
  .split("\n")
  .filter(Boolean)
  .filter((file) => /\.(ts|tsx|js|mjs)$/.test(file));

test("protocol files do not import forbidden runtime, enterprise, or PMFreak layers", () => {
  for (const file of protocolFiles) {
    const source = readFileSync(file, "utf8");
    for (const blocked of FORBIDDEN) {
      assert.equal(source.includes(blocked), false, `forbidden dependency found in ${file}: ${blocked}`);
    }
  }
});

test("protocol capability claims require explicit injection ports", () => {
  const source = readFileSync("src/aoc/protocol/contracts/capability-claims.ts", "utf8");
  assert.match(source, /ports: CapabilityClaimPorts/);
  assert.match(source, /ports\.trustDomain/);
  assert.match(source, /ports\.trustCoordination/);
  assert.doesNotMatch(source, /getAocAdapter/);
  assert.doesNotMatch(source, /process\.env/);
});

test("enterprise runtime owns capability claim port composition", () => {
  const source = readFileSync("src/aoc/enterprise/runtime/composition.ts", "utf8");
  assert.match(source, /export function composeCapabilityClaimPorts/);
  assert.match(source, /getAocAdapter\("trustDomain"\)/);
  assert.match(source, /getAocAdapter\("trustCoordination"\)/);
  assert.match(source, /getAocAdapter\("securityAudit"\)/);
});
