import type { TrialPlan, TrialState, TrialUsage } from '../types/trial-types';

export interface TrialRepositoryContract {
  getByScope(input: { companyId: string; workspaceId: string; userId: string }): Promise<TrialState | null>;
  save(state: TrialState): Promise<TrialState>;
}

export interface ActivationProgressionContract {
  canAdvance(from: TrialState['activationStage'], to: TrialState['activationStage']): boolean;
}

export interface OperationalCapabilityResolverContract {
  hasCapability(plan: TrialPlan, capability: string): boolean;
}

export interface UsageSemanticsContract {
  registerUsage(current: TrialUsage, delta: Partial<TrialUsage>): TrialUsage;
}

export interface OperationalCreditSemanticsContract {
  consume(current: TrialState['credits'], units: number): TrialState['credits'];
  reserve(current: TrialState['credits'], units: number): TrialState['credits'];
}
