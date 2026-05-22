import type { ActivationStage } from '../enums/activation-stage';
import type { TrialStatus } from '../enums/trial-status';
import type { UpgradeReadiness } from '../enums/upgrade-readiness';

export type TenantScope = {
  companyId: string;
  workspaceId: string;
  userId: string;
};

export type TrialPlan = {
  id: string;
  name: string;
  maxProjects: number;
  maxUploads: number;
  maxMessages: number;
  maxStorageMb: number;
  operationalCapabilities: string[];
  premiumCapabilities: string[];
  collaborationLimits: {
    maxCollaborators: number;
    allowCrossWorkspaceVisibility: boolean;
  };
  exportLimits: {
    maxExportsPerWindow: number;
    permitAutomatedExports: boolean;
  };
  ingestionLimits: {
    maxIngestionOpsPerWindow: number;
    maxIngestionBatchSize: number;
  };
  metadata?: Record<string, unknown>;
};

export type TrialUsage = {
  messages: number;
  uploads: number;
  ingestionOps: number;
  synthesisGenerations: number;
  memoryOps: number;
  orchestrationOps: number;
  estimatedTokens: number;
  storageMb: number;
  windowStartedAt: string;
  windowEndsAt: string;
  snapshots: Array<{ at: string; key: string; value: number }>;
};

export type OperationalCredits = {
  available: number;
  consumed: number;
  reserved: number;
  replenishmentRatePerWindow: number;
  lifecycleResetAt: string | null;
  softDepletionThreshold: number;
  hardDepleted: boolean;
};

export type ActivationState = {
  stage: ActivationStage;
  milestones: Record<ActivationStage, boolean>;
  ahaMoments: string[];
  nextActions: string[];
  operationalMaturityScore: number;
  continuitySignals: string[];
};

export type TrialState = TenantScope & {
  id: string;
  status: TrialStatus;
  activationStage: ActivationStage;
  readiness: UpgradeReadiness;
  plan: TrialPlan;
  usage: TrialUsage;
  credits: OperationalCredits;
  activation: ActivationState;
  activatedAt: string | null;
  expiresAt: string;
  upgradedAt: string | null;
  lastActivityAt: string | null;
  createdAt: string;
  updatedAt: string;
  audit: {
    version: number;
    actorId: string | null;
    reason: string | null;
    tags: string[];
  };
  intelligence?: {
    engagementScore?: number;
    conversionSignals?: string[];
    riskFlags?: string[];
  };
};
