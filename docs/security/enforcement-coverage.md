# Enforcement Coverage (Phase 4.5)

- Privileged client creation is centralized through `createPrivilegedSupabaseClient` with fail-closed context requirements.
- Workspace member invite/snapshot helpers require governance permission checks and actor-scoped context.
- Billing webhook privileged writes are explicitly system-scoped.
- Telemetry persistence uses privileged context with recursion bypass guard.

Known gap:
- Replay-protection persistence and deterministic malformed-payload telemetry for attestation v2 are not complete.
