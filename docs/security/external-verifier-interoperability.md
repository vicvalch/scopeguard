# External verifier interoperability (Phase 6.0)

PMFreak now supports **controlled external verifier interoperability**.

- Not public federation.
- Not DID/blockchain.
- Not AOC Protocol yet.

## Discovery endpoints

- `GET /api/governance/trust/.well-known/capability-issuer`
- `GET /api/governance/trust/keys`

The keys endpoint does not expose symmetric HMAC secrets.

## Handshake runtime

External verifier flow:
1. Request handshake (`/api/governance/trust/handshakes/request`)
2. Owner/admin approve/reject/revoke.
3. Verifier uses one-time received token for verification posture checks.

Raw handshake tokens are never persisted, only `handshake_token_hash`.

## Verification model

External verification currently relies on:
- PMFreak server-side verify endpoint, and
- approved verifier policy or approved handshake.
