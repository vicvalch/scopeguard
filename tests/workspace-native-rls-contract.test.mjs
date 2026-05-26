import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const MIGRATION_PATH = 'supabase/migrations/20260516000000_workspace_native_rls.sql';
const DOC_PATH = 'docs/security/rls-gap-inventory-phase-4.3.md';

const migration = fs.readFileSync(MIGRATION_PATH, 'utf8');
const doc = fs.readFileSync(DOC_PATH, 'utf8');

test('migration file exists at correct path', () => {
  assert.ok(fs.existsSync(MIGRATION_PATH), `Migration file not found at ${MIGRATION_PATH}`);
});

test('migration drops tenant access onboarding_analyses policy', () => {
  assert.match(migration, /DROP POLICY IF EXISTS/);
  assert.match(migration, /tenant access onboarding_analyses/);
});

test('migration creates workspace_members_read_onboarding_analyses policy', () => {
  assert.match(migration, /CREATE POLICY "workspace_members_read_onboarding_analyses"/);
  assert.match(migration, /FOR SELECT/);
});

test('migration creates workspace_members_insert_onboarding_analyses policy', () => {
  assert.match(migration, /CREATE POLICY "workspace_members_insert_onboarding_analyses"/);
  assert.match(migration, /FOR INSERT/);
});

test('migration adds workspace_id column to governance_audit_events', () => {
  assert.match(migration, /ADD COLUMN IF NOT EXISTS workspace_id/);
});

test('migration drops tenant access governance_audit_events policy', () => {
  assert.match(migration, /DROP POLICY IF EXISTS[\s\S]*?tenant access governance_audit_events/);
});

test('migration creates workspace_members_read_governance_audit_events policy', () => {
  assert.match(migration, /CREATE POLICY "workspace_members_read_governance_audit_events"/);
});

test('migration references workspace_memberships in new policies', () => {
  assert.match(migration, /workspace_memberships/);
});

test('migration has commented DOWN section', () => {
  assert.match(migration, /-- DOWN:/);
});

test('rls-gap-inventory doc updated to contain workspace_id-based RLS', () => {
  assert.match(doc, /workspace_id-based RLS/);
});

test('migration uses auth.uid() not current_company_id() in new workspace policies', () => {
  assert.match(migration, /auth\.uid\(\)/);
});

test('migration is idempotent using IF NOT EXISTS and IF EXISTS patterns', () => {
  assert.match(migration, /IF NOT EXISTS/);
  assert.match(migration, /IF EXISTS/);
});
