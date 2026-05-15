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
- Replay prevention for agent attestation is implemented via nonce-based persistence in the `agent_attestation_nonces` table. Each token's sha256 hash is recorded on first use; subsequent uses are rejected with `replay_detected`. Expired rows can be purged via `purge_expired_nonces()`.
