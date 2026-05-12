# Delegated authority (Phase 5.3)

PMFreak now supports PMFreak-native delegated capabilities derived from governance approvals/execution grants.

## Enforced now
- Delegations are constrained by action/scope/permission/TTL/max uses.
- Raw delegation token is never stored; only `delegation_token_hash` is persisted.
- Delegation lineage tracks parent decision/grant + delegator/delegatee.
- Revocation + expiration + replay protections are emitted to security telemetry.

## Not implemented
- No decentralized exchange.
- No external federation.
- No portable cross-system capability protocol.

This is an early delegated capability layer, not full AOC Protocol.
