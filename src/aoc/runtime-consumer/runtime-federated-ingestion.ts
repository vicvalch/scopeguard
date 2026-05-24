import type { FederatedOperationalEvent } from "@/lib/live-federation/ingestion/event-normalizer";

export type RuntimeIngestionProjection = {
  eventMemory: string[];
  cognitionSynthesisInputs: string[];
  executiveRuntimeSignals: string[];
  telemetrySurfaces: string[];
};

export function projectIngressToRuntime(event: FederatedOperationalEvent): RuntimeIngestionProjection {
  const id = event.lineage.ingressId;
  return {
    eventMemory: [id],
    cognitionSynthesisInputs: [event.eventType, event.severity],
    executiveRuntimeSignals: [event.sourceSystem, event.freshness],
    telemetrySurfaces: event.signalVector,
  };
}
