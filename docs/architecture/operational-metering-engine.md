# Operational Metering Engine

PMFreak's operational metering engine is a deterministic accounting runtime for operational intelligence workload, not a request counter.

## Philosophy
- Meter operational cognition and orchestration workload instead of provider tokens.
- Preserve provider independence and avoid pricing coupling.
- Produce replay-safe canonical events for audit and reconciliation readiness.

## Operational Credits
Credits represent governed operational capacity and support reservation, consumption, replenishment, depletion signaling, and future grants/enterprise overrides.

## Orchestration Intensity
Intensity (`low`..`critical`) multiplies category-weighted usage to reflect true operational complexity (e.g. synthesis, correlation, executive generation).

## Replay Safety & Reconciliation
Each event has deterministic identity and `replaySafeHash` for dedupe and replay protection. Reconciliation snapshots expose integrity signals without forcing full event sourcing.

## Policy-Driven Accounting
Consumption is policy-based with category weights, intensity multipliers, capability multipliers, and future extension points for enterprise and sponsor controls.

## Lifecycle-Safe Accounting
Metering state integrates into trial lifecycle without tight coupling. Trial runtime can consume allowance signals and operational usage posture for activation/readiness decisions.

## Future Monetization & Enterprise Quotas
The model supports future quota windows, sponsor-funded credits, temporary expansions, and billing reconciliation workflows while remaining payment-processor agnostic.
