export const OPERATION_CATEGORIES = [
  'messaging','ingestion','synthesis','continuity','orchestration','retrieval','correlation','executive_generation','intervention','memory_operation','activation_progression','intelligence_traversal'
] as const;
export type OperationCategory = (typeof OPERATION_CATEGORIES)[number];

export type OrchestrationIntensity = 'low' | 'standard' | 'elevated' | 'high' | 'critical';

export type OperationalUsageDelta = {
  units: number;
  operationCount: number;
  complexityScore?: number;
};

export type OperationalUsageAttribution = {
  capabilityKeys: string[];
  activationStage?: string;
  readinessBand?: string;
  policyContext?: Record<string, unknown>;
};

export type OperationalConsumptionWindow = {
  windowId: string;
  windowType: 'rolling' | 'fixed' | 'replenishment';
  startsAt: string;
  endsAt: string;
  resetAt: string;
};

export type LineageMetadata = {
  lineageId?: string;
  parentEventId?: string;
  lifecycleVersion?: number;
  sourceTransition?: string;
};

export type TelemetryMetadata = {
  diagnostics: Record<string, number>;
  tags: string[];
  source: string;
};

export type OperationalMeteringEvent = {
  eventId: string;
  eventType: 'usage_registered' | 'credits_consumed' | 'credits_replenished' | 'credits_reserved' | 'allowance_validated';
  companyId: string;
  workspaceId: string;
  userId: string;
  runtimeCorrelationId: string;
  operationCategory: OperationCategory;
  orchestrationIntensity: OrchestrationIntensity;
  usageDelta: OperationalUsageDelta;
  operationalCreditsConsumed: number;
  occurredAt: string;
  sourceRuntime: string;
  replaySafeHash: string;
  lineageMetadata: LineageMetadata;
  telemetryMetadata: TelemetryMetadata;
  attribution: OperationalUsageAttribution;
};

export type OperationalUsageSnapshot = {
  companyId: string;
  workspaceId: string;
  window: OperationalConsumptionWindow;
  categoryUsage: Record<OperationCategory, number>;
  credits: {
    available: number;
    reserved: number;
    consumed: number;
  };
  totals: {
    units: number;
    operations: number;
  };
  lastEventId: string | null;
  generatedAt: string;
};
