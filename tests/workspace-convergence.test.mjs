import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workspaceShell = readFileSync("src/components/pmfreak/workspace/workspace-shell.tsx", "utf8");
const workspaceConversationShell = readFileSync("src/components/pmfreak/workspace/workspace-conversation-shell.tsx", "utf8");
const copilotPage = readFileSync("src/app/(protected)/copilot/page.tsx", "utf8");
const workspacePage = readFileSync("src/app/(protected)/workspace/page.tsx", "utf8");

test("workspace mounts canonical conversation runtime", () => {
  assert.match(workspaceShell, /WorkspaceConversationShell/);
  assert.match(workspaceConversationShell, /fetch\("\/api\/copilot",/);
});

test("workspace no longer exposes open copilot CTA", () => {
  assert.doesNotMatch(workspaceShell, /Open Copilot/);
});

test("copilot route is compatibility redirect to canonical workspace", () => {
  assert.match(copilotPage, /redirect\("\/workspace"\)/);
});

test("workspace remains canonical protected landing surface", () => {
  assert.match(workspacePage, /WorkspaceShell/);
});
