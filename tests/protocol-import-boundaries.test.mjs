import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const FORBIDDEN = ["@/lib", "@/app", "@/sdk", "@/aoc/enterprise"];

test("protocol contracts do not import forbidden PMFreak layers", () => {
  const source = readFileSync("src/aoc/protocol/contracts/capability-claims.ts", "utf8");
  for (const blocked of FORBIDDEN) {
    assert.equal(source.includes(blocked), false, `forbidden import found in protocol contract: ${blocked}`);
  }
});
