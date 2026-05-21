import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const engine = fs.readFileSync("src/lib/vault/learned-execution-patterns.ts", "utf8");
const route = fs.readFileSync("src/app/api/copilot/route.ts", "utf8");

test("engine exports deterministic learned execution APIs", () => {
  for (const token of [
    "export async function detectLearnedExecutionPatterns",
    "export function calculatePatternRecurrence",
    "export function scoreExecutionPattern",
    "export function classifyExecutionPatternSeverity",
    "export function buildPatternSummary",
    "normalizePatternFingerprint",
    "groupRecurringOperationalSignals",
    "buildPatternFingerprint",
  ]) assert.match(engine, new RegExp(token));
});

test("detection logic includes deterministic recurrence, trend, and dedupe", () => {
  assert.match(engine, /const grouped = new Map<string, VaultNutrient\[]>\(\)/);
  assert.match(engine, /const recurrenceDensity = Number\(\(nutrients\.length \/ Math\.max\(1, lookbackDays\)\)\.toFixed\(4\)\)/);
  assert.match(engine, /const trend = secondHalf > firstHalf \? "increasing" : secondHalf < firstHalf \? "decreasing" : "stable"/);
  assert.match(engine, /\.eq\("workspace_id", request\.workspaceId\)/);
  assert.match(engine, /if \(request\.projectId\) query = query\.eq\("project_id", request\.projectId\)/);
});

test("engine enforces bounded limits and evidence caps", () => {
  assert.match(engine, /MAX_EXECUTION_PATTERNS = 12/);
  assert.match(engine, /MAX_PATTERN_SUMMARIES = 6/);
  assert.match(engine, /MAX_PATTERN_EVIDENCE = 4/);
  assert.match(engine, /MAX_PATTERN_EVIDENCE_CHARS = 240/);
  assert.match(engine, /slice\(0, MAX_PATTERN_EVIDENCE_CHARS\)/);
});

test("severity and scoring rules are explicit and deterministic", () => {
  assert.match(engine, /if \(input\.patternType === "escalation_cycle" && repeatedUnresolved\) return "critical"/);
  assert.match(engine, /if \(input\.patternType === "chronic_blocker" && repeatedUnresolved\) return "critical"/);
  assert.match(engine, /if \(input\.patternType === "dependency_failure" && input\.recurrenceCount >= 2\) return "high"/);
  assert.match(engine, /if \(input\.patternType === "governance_instability" && input\.recurrenceCount >= 2\) return "high"/);
  assert.match(engine, /Math\.min\(1, recurrenceComponent \+ unresolvedComponent \+ escalationComponent/);
  assert.match(engine, /return Math\.max\(0, Math\.min\(100/);
});

test("engine fail-soft degraded behavior exists", () => {
  assert.match(engine, /status: "degraded"/);
  assert.match(engine, /degradationReason/);
  assert.match(engine, /execution_pattern_detection_failed/);
});

test("copilot route integrates learned execution patterns before inference", () => {
  assert.match(route, /detectLearnedExecutionPatterns/);
  assert.match(route, /const learnedExecutionPatterns = await detectLearnedExecutionPatterns\(/);
  assert.match(route, /Execution Pattern Signals:/);
  assert.match(route, /Execution pattern summary:/);
  assert.doesNotMatch(route, /Execution Pattern Signals:[\s\S]*"evidence":/);
});
