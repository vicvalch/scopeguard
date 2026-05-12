# Trust Domains (Phase 5.5)

PMFreak now includes a **trust-domain-aware verification layer** for capability claims.

## What this phase is
- Trust domain registry + signing-key metadata.
- Federated verification preparation across controlled boundaries.
- Verifier workspace trust policy checks.

## What this phase is NOT
- Not public federation.
- Not DID.
- Not blockchain.
- Not AOC Protocol yet.

## Current verification modes
- `local`
- `trusted_external`
- `federation_ready`

## Key safety
- No raw signing secrets are stored in DB tables or migrations.
- Claims are still HMAC-signed locally.
- Verification is mediated through trust-domain + key status metadata.

## Phase 6.0 controlled external verifier interoperability note
PMFreak supports controlled external verifier interoperability with discovery metadata + handshake runtime.
HMAC keys are not publicly exposed.
External verification currently relies on PMFreak verification endpoint or approved trust handshake.
Not public federation, DID/blockchain, or AOC Protocol yet.
