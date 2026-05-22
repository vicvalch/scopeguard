# PMFreak Operational Readiness Trial Domain Foundation

## Philosophy
The trial domain is modeled as a governed operational lifecycle engine, not a UI trial flag. State is deterministic, tenant-scoped, validation-first, and prepared for event-driven orchestration.

## Canonical Entities
- `TrialState`: authoritative tenant/workspace/user scoped runtime state.
- `TrialPlan`: capability and usage envelope.
- `TrialUsage`: operational consumption metrics and windowed snapshots.
- `OperationalCredits`: abstract consumption currency for orchestration intensity.
- `ActivationState`: onboarding maturity progression and future orchestration hooks.

## Lifecycle Semantics
Trial lifecycle is computed from expiration, credit depletion, and conversion milestones. Runtime can shift to `expiring`, `expired`, `restricted`, or `converted` via pure deterministic evaluation.

## Operational Credits Semantics
Credits represent governed operational throughput rather than raw tokens. This abstraction supports future monetization, AI cost attribution, and multi-provider reconciliation without exposing provider-specific internals.

## Activation & Readiness
Activation stage progression is ordered and monotonic for orchestration integrity. Upgrade readiness is derived from semantic operational engagement (usage intensity and synthesis depth), not simplistic day counters.

## Tenant Scope and Isolation
All major entities carry `companyId`, `workspaceId`, and `userId` to ensure multi-workspace enterprise isolation and delegated operational access support.

## Extensibility Strategy
Contracts and schemas isolate future persistence/metering/billing/gating engines. The domain supports Supabase persistence adapters, event streams, capability enforcement policies, and enterprise governance overlays.
