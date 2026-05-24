import type { FederatedOperationalEvent } from "./event-normalizer.js";

export type SignalRouteTarget =
  | "operational-memory"
  | "telemetry-runtime"
  | "continuity-retrieval"
  | "cross-domain-correlation"
  | "executive-command-runtime"
  | "organizational-digital-twin";

export type RoutedSignal = {
  target: SignalRouteTarget;
  eventId: string;
  workspaceId: string;
  deliveredAt: string;
};

export function routeOperationalSignal(event: FederatedOperationalEvent): RoutedSignal[] {
  const targets: SignalRouteTarget[] = [
    "operational-memory",
    "telemetry-runtime",
    "continuity-retrieval",
    "cross-domain-correlation",
    "executive-command-runtime",
    "organizational-digital-twin",
  ];

  return targets.map((target) => ({
    target,
    eventId: event.lineage.ingressId,
    workspaceId: event.workspaceId,
    deliveredAt: new Date().toISOString(),
  }));
}
