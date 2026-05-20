import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const APP_FORBIDDEN = [
  "@/lib/aoc/enterprise/runtime",
  "@/lib/aoc/enterprise/authorization",
  "@/aoc/enterprise/runtime",
  "@/lib/security/execution-grants",
  "@/lib/security/delegated-capabilities",
  "@/lib/security/agent-access",
  "@/lib/security/access-guards",
];

const CONSUMER_ADAPTER_ALLOWLIST = new Set([
  "src/aoc/runtime-consumer/runtime-authorization.ts",
  "src/aoc/runtime-consumer/runtime-execution-grants.ts",
  "src/aoc/runtime-consumer/runtime-delegation.ts",
  "src/aoc/runtime-consumer/runtime-agent-access.ts",
  "src/aoc/runtime-consumer/runtime-capabilities.ts",
]);

function collectFiles(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) collectFiles(p, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(p.replaceAll("\\", "/"));
  }
  return out;
}

test("app routes use runtime-consumer authority boundary", () => {
  for (const file of collectFiles("src/app")) {
    const src = readFileSync(file, "utf8");
    for (const forbidden of APP_FORBIDDEN) assert.equal(src.includes(forbidden), false, `${file} must not import ${forbidden}`);
    if (src.includes("authorizeRuntimeAction(") || src.includes("enforceRuntimeAuthorization(") || src.includes("consumeDelegatedCapability(") || src.includes("consumeExecutionGrant(")) {
      assert.equal(src.includes("@/aoc/runtime-consumer"), true, `${file} must import runtime authority from @/aoc/runtime-consumer`);
    }
  }
});

test("only allowlisted runtime-consumer adapters import legacy security internals", () => {
  for (const file of collectFiles("src/aoc/runtime-consumer")) {
    const src = readFileSync(file, "utf8");
    const importsLegacy = src.includes("@/lib/security/") || src.includes("@/lib/aoc/enterprise/");
    if (importsLegacy) assert.equal(CONSUMER_ADAPTER_ALLOWLIST.has(file), true, `${file} is not allowlisted for legacy imports`);
  }
});

test("enterprise runtime implementation does not import runtime-consumer", () => {
  for (const file of collectFiles("src/aoc/enterprise")) {
    const src = readFileSync(file, "utf8");
    assert.equal(src.includes("@/aoc/runtime-consumer"), false, `${file} must not import runtime-consumer`);
  }
});

test("protocol layer does not import runtime-consumer", () => {
  for (const file of collectFiles("src/aoc/protocol")) {
    const src = readFileSync(file, "utf8");
    assert.equal(src.includes("@/aoc/runtime-consumer"), false, `${file} must not import runtime-consumer`);
  }
});
