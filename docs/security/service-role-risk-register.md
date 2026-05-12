# Service-Role Risk Register (Phase 4.5)

## Active privileged surfaces
- `src/lib/security/telemetry.ts`: writes security events with service-role context.
- `src/lib/workspace-team.ts`: invitation/member seat accounting and invitation writes.
- `src/lib/billing.ts`: webhook idempotency and subscription sync writes.

## Controls in place
- Explicit privileged context contract and fail-closed checks.
- `privileged_client_used` telemetry on privileged acquisition.
- Governance checks for member/billing control paths.

## Remaining risks
- Service-role blast radius remains high if server runtime compromised.
- Replay prevention for agent attestation is not yet persisted/enforced.
