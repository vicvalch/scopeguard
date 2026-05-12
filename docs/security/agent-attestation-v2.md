# Agent Attestation v2 Status

Implemented now:
- Signed HMAC token verification.
- Token binding checks for `agentId` + `workspaceId`.
- Expiration check.
- Scope enforcement via `requireAgentScope`.

Not yet fully enforced:
- Replay protection (`jti`/nonce store) is not implemented yet.
- Issued-at skew window and max lifetime checks are pending.
- Deterministic malformed JSON telemetry is partial and should be hardened further.

Fail-closed behavior:
- Missing secret currently denies attestation flow.
