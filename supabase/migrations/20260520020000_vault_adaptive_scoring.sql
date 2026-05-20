-- Adaptive Severity & Confidence Engine — schema extension
--
-- Extends vault_learned_patterns with adaptive scoring fields.
-- All new columns are nullable with safe defaults to preserve backward
-- compatibility. Existing rows remain valid without migration.
--
-- This migration must be applied AFTER 20260520010000_vault_learned_patterns.sql

-- ─── Adaptive Scoring Columns ─────────────────────────────────────────────────

alter table public.vault_learned_patterns
  add column if not exists adaptive_severity text
    check (adaptive_severity in ('low', 'medium', 'high', 'critical')),
  add column if not exists adaptive_confidence numeric(4,3)
    check (adaptive_confidence is null or (adaptive_confidence >= 0 and adaptive_confidence <= 1)),
  add column if not exists operational_urgency text
    check (operational_urgency in ('critical', 'high', 'moderate', 'low', 'informational')),
  add column if not exists escalation_likelihood numeric(4,3)
    check (escalation_likelihood is null or (escalation_likelihood >= 0 and escalation_likelihood <= 1)),
  add column if not exists contradiction_count integer not null default 0,
  add column if not exists recovery_count integer not null default 0,
  -- Full adaptive scoring result stored as JSONB for auditability and evolution history
  add column if not exists adaptive_scoring jsonb;

-- ─── Indexes ──────────────────────────────────────────────────────────────────

create index if not exists vault_learned_patterns_adaptive_severity_idx
  on public.vault_learned_patterns(workspace_id, adaptive_severity)
  where adaptive_severity is not null;

create index if not exists vault_learned_patterns_operational_urgency_idx
  on public.vault_learned_patterns(workspace_id, operational_urgency)
  where operational_urgency is not null;

create index if not exists vault_learned_patterns_escalation_likelihood_idx
  on public.vault_learned_patterns(workspace_id, escalation_likelihood desc)
  where escalation_likelihood is not null;

-- No new RLS policies required: adaptive_scoring columns inherit the
-- existing workspace-scoped RLS from vault_learned_patterns.
