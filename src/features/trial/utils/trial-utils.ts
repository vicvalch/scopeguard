import { ACTIVATION_STAGES } from '../enums/activation-stage';
import type { OperationalCredits, TrialPlan, TrialUsage } from '../types/trial-types';
import type { ActivationStage } from '../enums/activation-stage';
import type { UpgradeReadiness } from '../enums/upgrade-readiness';

export const evaluateLimit = (used: number, max: number) => ({ used, max, remaining: Math.max(max - used, 0), exceeded: used > max, atLimit: used >= max });

export const evaluateUsageThreshold = (used: number, max: number) => ({
  ratio: max === 0 ? 1 : used / max,
  softReached: used >= max * 0.8,
  hardReached: used >= max,
});

export const detectCreditDepletion = (credits: OperationalCredits) => ({
  softDepleted: credits.available <= credits.softDepletionThreshold,
  hardDepleted: credits.hardDepleted || credits.available <= 0,
});

export const calculateExpirationState = (expiresAtIso: string, nowIso: string) => {
  const ms = new Date(expiresAtIso).getTime() - new Date(nowIso).getTime();
  const daysLeft = Math.ceil(ms / (1000 * 60 * 60 * 24));
  return { expired: ms <= 0, expiringSoon: ms > 0 && daysLeft <= 7, daysLeft };
};

export const checkActivationProgression = (current: ActivationStage, next: ActivationStage) =>
  ACTIVATION_STAGES.indexOf(next) >= ACTIVATION_STAGES.indexOf(current);

export const evaluateReadiness = (usage: TrialUsage, plan: TrialPlan): UpgradeReadiness => {
  const messageRatio = plan.maxMessages === 0 ? 1 : usage.messages / plan.maxMessages;
  if (messageRatio >= 1 || usage.synthesisGenerations >= 5) return 'enterprise_candidate';
  if (messageRatio >= 0.8) return 'high_intent';
  if (messageRatio >= 0.5) return 'engaged';
  if (usage.messages > 0 || usage.uploads > 0) return 'emerging';
  return 'low';
};
