import type { OperationCategory, OperationalMeteringEvent, OperationalUsageSnapshot } from '../domain/metering-types';

export type MeteringRuntimeState = {
  dedupeHashes: Set<string>;
  events: OperationalMeteringEvent[];
  categoryUsage: Record<OperationCategory, number>;
  credits: { available: number; reserved: number; consumed: number; softThreshold: number; hardDepleted: boolean };
};

export const createMeteringRuntimeState = (startingCredits: number, softThreshold = 25): MeteringRuntimeState => ({
  dedupeHashes: new Set(),
  events: [],
  categoryUsage: {
    messaging: 0, ingestion: 0, synthesis: 0, continuity: 0, orchestration: 0, retrieval: 0,
    correlation: 0, executive_generation: 0, intervention: 0, memory_operation: 0, activation_progression: 0, intelligence_traversal: 0,
  },
  credits: { available: startingCredits, reserved: 0, consumed: 0, softThreshold, hardDepleted: false },
});

export const createUsageSnapshot = (
  state: MeteringRuntimeState,
  snapshot: Omit<OperationalUsageSnapshot, 'categoryUsage' | 'credits' | 'totals'>,
): OperationalUsageSnapshot => ({
  ...snapshot,
  categoryUsage: { ...state.categoryUsage },
  credits: { available: state.credits.available, reserved: state.credits.reserved, consumed: state.credits.consumed },
  totals: {
    units: Object.values(state.categoryUsage).reduce((a, b) => a + b, 0),
    operations: state.events.length,
  },
});
