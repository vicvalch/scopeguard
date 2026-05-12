# Capability Claims (Phase 5.4)

PMFreak now emits signed `pmfreak-capability-claim-v1` proofs for execution grants and delegated capabilities.

- Claims are signed proofs, **not bearer execution tokens**.
- Local DB grants/delegations and token consumption checks are still required.
- This is **not** AOC Protocol, federation, DID, or cross-chain.
- Claims are a portable-proof preparation layer for future protocol-compatible verification.


## Phase 5.5 trust-domain note
Capability verification is now trust-domain-aware with issuer and key metadata checks. This is not public federation, DID, blockchain, or AOC Protocol yet; it is structural preparation for protocol-grade verification.
