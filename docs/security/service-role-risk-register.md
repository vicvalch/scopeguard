# Service-role Risk Register (Phase 4.4 snapshot)

## High-risk call sites still present
- `src/lib/security/telemetry.ts`: service-role insert into `security_events`; acceptable for centralized audit write, but depends on app-layer integrity and should include explicit call-context provenance for each event.
- `src/lib/workspace-team.ts`: service-role reads/writes memberships and invitations. Requires strict pre-checks upstream; currently library-level function can be called without route-level guard context.
- `src/lib/billing.ts`: service-role used for subscription state reads/writes and webhook updates; justified for Stripe webhook processing and cross-tenant billing reconciliations, but requires strict route/event validation.
- `src/lib/feature-gates.ts`: service-role path used for usage/subscription checks and project counts; some checks still rely on `companyId` legacy tenancy mapping.

## Medium-risk patterns
- `createSupabaseAdminClient` warning-only signal in `src/lib/db/supabase-server.ts`; no enforced guard contract at helper boundary.

## Required follow-ups
1. Add explicit `routeId` and actor context at every privileged client acquisition and emit `privileged_client_used` telemetry consistently.
2. Prevent service-role helper use before guard completion in route handlers.
3. Remove fallback patterns where client silently upgrades from user-scoped to service-role execution.
