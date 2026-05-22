import type { MeteringRuntimeState } from '../state/metering-state';

export type UsageReconciliationSnapshot = {
  eventCount: number;
  distinctReplayHashes: number;
  availableCredits: number;
  consumedCredits: number;
  integrityOk: boolean;
};

export const generateUsageReconciliationSnapshot = (state: MeteringRuntimeState): UsageReconciliationSnapshot => ({
  eventCount: state.events.length,
  distinctReplayHashes: state.dedupeHashes.size,
  availableCredits: state.credits.available,
  consumedCredits: state.credits.consumed,
  integrityOk: state.events.length >= state.dedupeHashes.size,
});
