# Asymmetric verification (Phase 6.1)

PMFreak now supports Ed25519 capability-claim signatures (`pmfreak-capability-claim-v1.2`) that can be verified independently with public keys.

- Ed25519 claims: independently verifiable via discovered public keys.
- HMAC claims: remain server-mediated.
- Verification endpoint remains available.
- Independent verification does not grant execution authorization.
- Not public federation, not DID/blockchain, not AOC Protocol yet.
