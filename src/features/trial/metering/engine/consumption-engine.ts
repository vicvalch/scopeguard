import type { OperationCategory, OperationalUsageDelta, OrchestrationIntensity } from '../domain/metering-types';
import type { OperationalConsumptionPolicy } from '../policies/consumption-policies';

export const evaluateOperationalConsumption = (input: {
  category: OperationCategory;
  intensity: OrchestrationIntensity;
  delta: OperationalUsageDelta;
  capabilityKeys?: string[];
  policy: OperationalConsumptionPolicy;
}) => {
  const categoryWeight = input.policy.categoryWeights[input.category];
  const intensityMultiplier = input.policy.intensityMultipliers[input.intensity];
  const capabilityMultiplier = (input.capabilityKeys ?? []).reduce((acc, key) => acc * (input.policy.capabilityMultipliers[key] ?? 1), 1);
  const multiplier = intensityMultiplier * capabilityMultiplier * (input.policy.enterpriseOverrideMultiplier ?? 1) * (input.policy.pmoTierMultiplier ?? 1);
  const gross = input.delta.units * categoryWeight * multiplier;
  const net = Math.max(0, gross - (input.policy.sponsorGrantOffset ?? 0));
  return { categoryWeight, intensityMultiplier, capabilityMultiplier, multiplier, grossCredits: gross, netCredits: net };
};
