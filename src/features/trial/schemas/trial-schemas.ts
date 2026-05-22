import { ACTIVATION_STAGES } from '../enums/activation-stage';
import { TRIAL_STATUSES } from '../enums/trial-status';
import { UPGRADE_READINESS_LEVELS } from '../enums/upgrade-readiness';
import type { ActivationState, OperationalCredits, TrialPlan, TrialState, TrialUsage } from '../types/trial-types';

const isIsoDate = (value: unknown): value is string => typeof value === 'string' && !Number.isNaN(Date.parse(value));
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

export const parseTrialPlan = (input: unknown): TrialPlan => {
  if (!isRecord(input)) throw new Error('Invalid TrialPlan: expected object.');
  const requiredNumeric = ['maxProjects', 'maxUploads', 'maxMessages', 'maxStorageMb'] as const;
  for (const key of requiredNumeric) {
    if (typeof input[key] !== 'number' || input[key] < 0) throw new Error(`Invalid TrialPlan.${key}`);
  }
  if (typeof input.id !== 'string' || typeof input.name !== 'string') throw new Error('Invalid TrialPlan identity fields.');
  const operationalCapabilities = Array.isArray(input.operationalCapabilities) ? input.operationalCapabilities : [];
  const premiumCapabilities = Array.isArray(input.premiumCapabilities) ? input.premiumCapabilities : [];
  return input as TrialPlan;
};

export const parseTrialUsage = (input: unknown): TrialUsage => {
  if (!isRecord(input)) throw new Error('Invalid TrialUsage: expected object.');
  for (const key of ['messages', 'uploads', 'ingestionOps', 'synthesisGenerations', 'memoryOps', 'orchestrationOps', 'estimatedTokens', 'storageMb'] as const) {
    if (typeof input[key] !== 'number' || input[key] < 0) throw new Error(`Invalid TrialUsage.${key}`);
  }
  if (!isIsoDate(input.windowStartedAt) || !isIsoDate(input.windowEndsAt)) throw new Error('Invalid TrialUsage window timestamps.');
  if (!Array.isArray(input.snapshots)) throw new Error('Invalid TrialUsage.snapshots');
  return input as TrialUsage;
};

export const parseOperationalCredits = (input: unknown): OperationalCredits => {
  if (!isRecord(input)) throw new Error('Invalid OperationalCredits: expected object.');
  for (const key of ['available', 'consumed', 'reserved', 'replenishmentRatePerWindow', 'softDepletionThreshold'] as const) {
    if (typeof input[key] !== 'number' || input[key] < 0) throw new Error(`Invalid OperationalCredits.${key}`);
  }
  if (typeof input.hardDepleted !== 'boolean') throw new Error('Invalid OperationalCredits.hardDepleted');
  if (!(input.lifecycleResetAt === null || isIsoDate(input.lifecycleResetAt))) throw new Error('Invalid OperationalCredits.lifecycleResetAt');
  return input as OperationalCredits;
};

export const parseActivationState = (input: unknown): ActivationState => {
  if (!isRecord(input)) throw new Error('Invalid ActivationState: expected object.');
  if (!ACTIVATION_STAGES.includes(input.stage as never)) throw new Error('Invalid ActivationState.stage');
  if (!isRecord(input.milestones)) throw new Error('Invalid ActivationState.milestones');
  if (!Array.isArray(input.ahaMoments) || !Array.isArray(input.nextActions) || !Array.isArray(input.continuitySignals)) {
    throw new Error('Invalid ActivationState arrays');
  }
  if (typeof input.operationalMaturityScore !== 'number' || input.operationalMaturityScore < 0 || input.operationalMaturityScore > 100) {
    throw new Error('Invalid ActivationState.operationalMaturityScore');
  }
  return input as ActivationState;
};

export const parseTrialState = (input: unknown): TrialState => {
  if (!isRecord(input)) throw new Error('Invalid TrialState: expected object.');
  for (const idKey of ['id', 'companyId', 'workspaceId', 'userId'] as const) {
    if (typeof input[idKey] !== 'string' || !input[idKey]) throw new Error(`Invalid TrialState.${idKey}`);
  }
  if (!TRIAL_STATUSES.includes(input.status as never)) throw new Error('Invalid TrialState.status');
  if (!ACTIVATION_STAGES.includes(input.activationStage as never)) throw new Error('Invalid TrialState.activationStage');
  if (!UPGRADE_READINESS_LEVELS.includes(input.readiness as never)) throw new Error('Invalid TrialState.readiness');
  parseTrialPlan(input.plan);
  parseTrialUsage(input.usage);
  parseOperationalCredits(input.credits);
  parseActivationState(input.activation);
  for (const d of ['expiresAt', 'createdAt', 'updatedAt'] as const) {
    if (!isIsoDate(input[d])) throw new Error(`Invalid TrialState.${d}`);
  }
  return input as TrialState;
};
