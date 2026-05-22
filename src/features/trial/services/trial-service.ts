import type { TrialState } from '../types/trial-types';
import { deriveUpgradeReadiness, resolveTrialStatus } from '../domain/trial-domain';

export const advanceTrialRuntimeState = (trial: TrialState, nowIso: string): TrialState => {
  const status = resolveTrialStatus(trial, nowIso);
  const readiness = deriveUpgradeReadiness(trial);
  return { ...trial, status, readiness, updatedAt: nowIso };
};
