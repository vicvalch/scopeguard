# Governance runtime

## Enforced
- Runtime evaluates governed actions and creates approval requests when decisions require human/admin approval.
- `/api/copilot` now supports execution-grant consumption (`x-pmf-execution-grant`) to continue after prior approval.

## Prepared
- Additional governed route integration for billing and other high-risk operations.

## Not implemented
- Protocol-grade capability distribution and portable external grant verification.


## Phase 5.3 delegated authority
- Adds PMFreak-native delegated capabilities with lineage, revocation, expiry, and max-use constraints.
- Explicitly *not* full AOC Protocol or decentralized federation.
