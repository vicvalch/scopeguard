# Capability claims

Supported versions:
- `pmfreak-capability-claim-v1`
- `pmfreak-capability-claim-v1.1`
- `pmfreak-capability-claim-v1.2`

`v1.2` adds asymmetric Ed25519 proof support with independent verification.
Proof shape:
- `algorithm`: `HMAC-SHA256 | Ed25519`
- `keyId`
- `trustDomain`
- `issuedAt`
- `signature`

HMAC remains server-mediated. Independent verification does not imply execution authorization.
Not public federation, DID/blockchain, or AOC Protocol yet.
