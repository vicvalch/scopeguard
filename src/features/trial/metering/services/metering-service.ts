import type { OperationCategory, OperationalUsageDelta, OrchestrationIntensity } from '../domain/metering-types';
import { DEFAULT_OPERATIONAL_CONSUMPTION_POLICY, type OperationalConsumptionPolicy } from '../policies/consumption-policies';
import { evaluateOperationalConsumption } from '../engine/consumption-engine';
import { buildOperationalMeteringEvent } from '../events/metering-events';
import { createMeteringRuntimeState, createUsageSnapshot, type MeteringRuntimeState } from '../state/metering-state';
import { detectMeteringAnomalies } from '../guards/metering-guards';
import { createOperationalTelemetryEvent } from '../telemetry/telemetry';

export const registerOperationalUsage = (state: MeteringRuntimeState, input: {
  companyId: string; workspaceId: string; userId: string; runtimeCorrelationId: string; category: OperationCategory;
  intensity: OrchestrationIntensity; delta: OperationalUsageDelta; occurredAt: string; sourceRuntime: string; capabilityKeys?: string[];
  policy?: OperationalConsumptionPolicy;
}) => {
  const policy = input.policy ?? DEFAULT_OPERATIONAL_CONSUMPTION_POLICY;
  const evaluated = evaluateOperationalConsumption({ category: input.category, intensity: input.intensity, delta: input.delta, capabilityKeys: input.capabilityKeys, policy });
  const event = buildOperationalMeteringEvent({
    eventType: 'usage_registered', companyId: input.companyId, workspaceId: input.workspaceId, userId: input.userId,
    runtimeCorrelationId: input.runtimeCorrelationId, operationCategory: input.category, orchestrationIntensity: input.intensity,
    usageDelta: input.delta, operationalCreditsConsumed: evaluated.netCredits, occurredAt: input.occurredAt, sourceRuntime: input.sourceRuntime,
    lineageMetadata: {}, telemetryMetadata: { diagnostics: {}, tags: [], source: input.sourceRuntime }, attribution: { capabilityKeys: input.capabilityKeys ?? [] },
  });
  const anomalies = detectMeteringAnomalies(state, event);
  if (state.dedupeHashes.has(event.replaySafeHash)) return { state, event, deduped: true, anomalies };
  state.dedupeHashes.add(event.replaySafeHash);
  state.events.push(event);
  state.categoryUsage[input.category] += input.delta.units;
  state.credits.available = Math.max(0, state.credits.available - evaluated.netCredits);
  state.credits.consumed += evaluated.netCredits;
  state.credits.hardDepleted = state.credits.available <= 0;
  return { state, event, deduped: false, anomalies, telemetry: createOperationalTelemetryEvent(event, { anomalies, evaluated }) };
};

export const consumeOperationalCredits = (state: MeteringRuntimeState, amount: number) => {
  state.credits.available = Math.max(0, state.credits.available - amount);
  state.credits.consumed += amount;
  state.credits.hardDepleted = state.credits.available <= 0;
  return state;
};
export const reserveOperationalCredits = (state: MeteringRuntimeState, amount: number) => { state.credits.reserved += amount; state.credits.available = Math.max(0, state.credits.available - amount); return state; };
export const replenishOperationalCredits = (state: MeteringRuntimeState, amount: number) => { state.credits.available += amount; state.credits.hardDepleted = false; return state; };
export const validateOperationalAllowance = (state: MeteringRuntimeState, expectedConsumption: number) => ({ allowed: state.credits.available >= expectedConsumption, softExhausted: state.credits.available <= state.credits.softThreshold, hardExhausted: state.credits.available <= 0 });
export const generateUsageSnapshot = (state: MeteringRuntimeState, input: { companyId: string; workspaceId: string; window: { windowId: string; windowType: 'rolling' | 'fixed' | 'replenishment'; startsAt: string; endsAt: string; resetAt: string }; lastEventId: string | null; generatedAt: string; }) => createUsageSnapshot(state, input);
export const createOperationalMeteringService = (startingCredits: number) => createMeteringRuntimeState(startingCredits);
