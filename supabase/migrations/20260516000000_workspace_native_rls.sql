-- Migration: workspace_native_rls
-- Switches onboarding_analyses and governance_audit_events from company_id-based
-- RLS to workspace_id-based RLS, matching the current tenant standard.
-- Safe to run with existing data: ADD COLUMN IF NOT EXISTS, nullable workspace_id
-- for governance_audit_events, and atomic policy replacement.

begin;

-- =============================================================================
-- PART A: onboarding_analyses — switch RLS from company_id to workspace_id
-- =============================================================================

-- Drop old company_id-based policy
DROP POLICY IF EXISTS "tenant access onboarding_analyses" ON public.onboarding_analyses;

-- Users can read analyses for workspaces they belong to
CREATE POLICY "workspace_members_read_onboarding_analyses"
  ON public.onboarding_analyses
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_memberships
      WHERE user_id = auth.uid()
    )
  );

-- Users can insert analyses for workspaces they belong to
CREATE POLICY "workspace_members_insert_onboarding_analyses"
  ON public.onboarding_analyses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_memberships
      WHERE user_id = auth.uid()
    )
  );

-- Index to support workspace-scoped queries
CREATE INDEX IF NOT EXISTS onboarding_analyses_workspace_id_created_at_idx
  ON public.onboarding_analyses (workspace_id, created_at DESC);

-- =============================================================================
-- PART B: governance_audit_events — add workspace_id + switch RLS
-- =============================================================================

-- Add workspace_id column (nullable — existing rows have no workspace context)
ALTER TABLE public.governance_audit_events
  ADD COLUMN IF NOT EXISTS workspace_id uuid null
  REFERENCES public.workspaces(id) ON DELETE SET NULL;

-- Index for workspace-scoped audit queries
CREATE INDEX IF NOT EXISTS governance_audit_events_workspace_idx
  ON public.governance_audit_events (workspace_id, occurred_at DESC);

-- Drop old company_id-based policy
DROP POLICY IF EXISTS "tenant access governance_audit_events" ON public.governance_audit_events;

-- SELECT policy: workspace membership check for new rows; company_id fallback for legacy rows
CREATE POLICY "workspace_members_read_governance_audit_events"
  ON public.governance_audit_events
  FOR SELECT
  TO authenticated
  USING (
    (workspace_id IS NOT NULL AND workspace_id IN (
      SELECT workspace_id FROM public.workspace_memberships
      WHERE user_id = auth.uid()
    ))
    OR
    (workspace_id IS NULL AND public.current_company_id() = company_id)
  );

-- INSERT policy intentionally omitted: governance audit event writes are
-- service-role only. The app uses createSupabaseServerClient (which bypasses
-- RLS via the service role key) for all governance_audit_events inserts.

commit;

-- =============================================================================
-- DOWN:
-- DROP POLICY IF EXISTS "workspace_members_read_onboarding_analyses" ON public.onboarding_analyses;
-- DROP POLICY IF EXISTS "workspace_members_insert_onboarding_analyses" ON public.onboarding_analyses;
-- DROP INDEX IF EXISTS onboarding_analyses_workspace_id_created_at_idx;
-- DROP POLICY IF EXISTS "workspace_members_read_governance_audit_events" ON public.governance_audit_events;
-- DROP INDEX IF EXISTS governance_audit_events_workspace_idx;
-- ALTER TABLE public.governance_audit_events DROP COLUMN IF EXISTS workspace_id;
-- (Recreate old company_id-based policies manually if rollback needed)
-- =============================================================================
