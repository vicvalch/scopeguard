export const WORKSPACE_DISPLAY = {
  readiness: {
    live: "Live",
    context: "Context",
    memory: "Memory",
    ready: "Ready",
  },
  states: {
    standby: "Standby",
    active: "Active",
    synced: "Synced",
    stable: "Stable",
    monitoring: "Monitoring",
    healthy: "Healthy",
    alignment: "Alignment",
    noActiveContext: "No active context",
  },
  labels: {
    workspace: "Workspace",
    operationallyLive: "Operationally live",
  },
} as const;
