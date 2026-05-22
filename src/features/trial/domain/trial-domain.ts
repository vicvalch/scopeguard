import type { TrialState } from '../types/trial-types';
import { calculateExpirationState, detectCreditDepletion, evaluateReadiness } from '../utils/trial-utils';

export const resolveTrialStatus = (trial: TrialState, nowIso: string): TrialState['status'] => {
  const expiry = calculateExpirationState(trial.expiresAt, nowIso);
  const creditState = detectCreditDepletion(trial.credits);
  if (trial.upgradedAt) return 'converted';
  if (expiry.expired) return 'expired';
  if (creditState.hardDepleted) return 'restricted';
  if (expiry.expiringSoon) return 'expiring';
  return trial.status === 'pending' ? 'active' : trial.status;
};

export const deriveUpgradeReadiness = (trial: TrialState): TrialState['readiness'] => evaluateReadiness(trial.usage, trial.plan);
