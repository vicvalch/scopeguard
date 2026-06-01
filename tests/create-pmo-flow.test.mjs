/**
 * Behavioral contract tests for the Create PMO transactional flow.
 *
 * These are static-analysis tests (readFileSync + assert) following the same
 * pattern as db-schema-contract.test.mjs. They verify that the source code
 * upholds the transactional guarantees — no redirect without confirmed
 * persistence, no draft clear on failure, no false-positive Brain Activated.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

const saveTenant = readFileSync(join(ROOT, "src/lib/pmo/save-pmo-tenant.ts"), "utf8");
const wizard = readFileSync(join(ROOT, "src/components/pmfreak/pmo/create-pmo-wizard.tsx"), "utf8");

// ─────────────────────────────────────────────────────────────────────────────
// CONTRACT: savePmoTenant three-state return type
// ─────────────────────────────────────────────────────────────────────────────

test("savePmoTenant declares explicit three-state contract", () => {
  assert.match(saveTenant, /status: "success"/, "must have success state");
  assert.match(saveTenant, /status: "recoverable_failure"/, "must have recoverable_failure state");
  assert.match(saveTenant, /status: "fatal_failure"/, "must have fatal_failure state");
});

test("savePmoTenant returns fatal_failure for validation errors", () => {
  assert.match(saveTenant, /fatal_failure.*validation_failed|validation_failed.*fatal_failure/s);
});

test("savePmoTenant returns fatal_failure when unauthenticated", () => {
  assert.match(saveTenant, /fatal_failure.*unauthenticated|unauthenticated.*fatal_failure/s);
});

test("savePmoTenant returns recoverable_failure on upsert error", () => {
  assert.match(saveTenant, /recoverable_failure.*upsert_error|upsert_error.*recoverable_failure/s);
});

test("savePmoTenant returns success only after confirmed upsert", () => {
  // The return { status: "success" } statement must come after the upsert block.
  // We search for the return statement specifically, not the type declaration.
  const returnSuccessIdx = saveTenant.indexOf('return { status: "success" }');
  const upsertIdx = saveTenant.indexOf('from("workspace_governance").upsert');
  assert.ok(upsertIdx > 0, "upsert call must exist");
  assert.ok(returnSuccessIdx > 0, "return success statement must exist");
  assert.ok(returnSuccessIdx > upsertIdx, "success return must appear after the upsert call");
});

// ─────────────────────────────────────────────────────────────────────────────
// CONTRACT: rollback on unexpected exception
// ─────────────────────────────────────────────────────────────────────────────

test("savePmoTenant has explicit rollback on exception", () => {
  assert.match(saveTenant, /rollback/, "rollback path must exist");
  assert.match(saveTenant, /\.delete\(\)/, "rollback must issue a delete");
  assert.match(saveTenant, /upsertedWorkspaceId/, "rollback must be gated on confirmed upsert");
});

// ─────────────────────────────────────────────────────────────────────────────
// CONTRACT: structured logs
// ─────────────────────────────────────────────────────────────────────────────

test("savePmoTenant emits structured logs with [pmo:save] prefix", () => {
  assert.match(saveTenant, /\[pmo:save\].*success/, "must log success");
  assert.match(saveTenant, /\[pmo:save\].*recoverable_failure/, "must log recoverable failure");
  assert.match(saveTenant, /\[pmo:save\].*fatal_failure/, "must log fatal failure");
});

// ─────────────────────────────────────────────────────────────────────────────
// CONTRACT: wizard handleCreate — no false-positive activation
// ─────────────────────────────────────────────────────────────────────────────

test("wizard handleCreate gates redirect on status=success", () => {
  // The redirect must only appear after a success check, not unconditionally
  assert.match(wizard, /result\.status !== "success"/, "must check status before proceeding");

  const blockReturnIdx = wizard.indexOf('result.status !== "success"');
  const redirectIdx = wizard.indexOf('router.push("/pmo/invite-team")');
  assert.ok(blockReturnIdx > 0, "failure branch must exist");
  assert.ok(redirectIdx > blockReturnIdx, "redirect must come after the failure guard");
});

test("wizard handleCreate does NOT clear draft on failure", () => {
  // clearDraft() inside handleCreate must only be called inside the success path.
  // The function definition `function clearDraft()` precedes the guard, but the
  // invocation `clearDraft()` within handleCreate must appear after the guard.
  const guardIdx = wizard.indexOf('result.status !== "success"');
  // Find the clearDraft() call that is inside handleCreate (after the guard).
  const callIdx = wizard.indexOf("clearDraft();", guardIdx);
  assert.ok(guardIdx > 0, "failure guard must exist");
  assert.ok(callIdx > guardIdx, "clearDraft() invocation must be after the failure guard (success-only path)");
});

test("wizard handleCreate does NOT write localStorage on failure", () => {
  // localStorage.setItem for the tenant must only be in the success path
  const guardIdx = wizard.indexOf('result.status !== "success"');
  const localStorageIdx = wizard.indexOf('localStorage.setItem("pmfreak.pmo.tenant"');
  assert.ok(localStorageIdx > guardIdx, "localStorage write must be inside the success path");
});

test("wizard shows blocking error when persistence fails", () => {
  assert.match(wizard, /createError/, "createError state must exist");
  assert.match(wizard, /Activation failed/, "blocking error message must be rendered");
  assert.match(wizard, /Retry/, "retry button must be rendered");
});

test("wizard sets creating=false and returns early on failure", () => {
  // setCreating(false) must appear inside the failure branch
  const guardStart = wizard.indexOf('result.status !== "success"');
  const guardEnd = wizard.indexOf("// Persistence confirmed");
  assert.ok(guardStart > 0 && guardEnd > guardStart, "failure branch boundaries must be identifiable");

  const failureBranch = wizard.slice(guardStart, guardEnd);
  assert.match(failureBranch, /setCreating\(false\)/, "must reset creating spinner on failure");
  assert.match(failureBranch, /return/, "must return early on failure");
});

test("Activate button is disabled while createError is set", () => {
  assert.match(wizard, /disabled=\{creating \|\| !!createError\}/, "activate button must be disabled when createError is present");
});

// ─────────────────────────────────────────────────────────────────────────────
// CONTRACT: no path activates PMO without real persistence
// ─────────────────────────────────────────────────────────────────────────────

test("wizard never pushes to invite-team without calling savePmoTenant", () => {
  // Every occurrence of router.push("/pmo/invite-team") must be preceded by
  // the savePmoTenant call in the same function scope.
  const saveIdx = wizard.indexOf("await savePmoTenant(tenant)");
  const pushIdx = wizard.indexOf('router.push("/pmo/invite-team")');
  assert.ok(saveIdx > 0, "savePmoTenant must be called");
  assert.ok(pushIdx > saveIdx, "redirect must come after savePmoTenant");

  // There must be exactly one occurrence of the redirect.
  const allPushes = [...wizard.matchAll(/router\.push\("\/pmo\/invite-team"\)/g)];
  assert.equal(allPushes.length, 1, "redirect to invite-team must appear exactly once");
});
