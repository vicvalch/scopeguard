export type PMModule = {
  href: string;
  label: string;
  shortLabel: string;
  description: string;
  status: "Live" | "New";
  group: "Core" | "Intelligence" | "Execution" | "System";
  memoryRole: string;
};

export const PM_MODULES: PMModule[] = [
  { href: "/dashboard", label: "Operational Home", shortLabel: "Home", description: "Unified operational status, memory health, and next-action alignment.", status: "Live", group: "Core", memoryRole: "Cross-workspace operational state" },
  { href: "/copilot", label: "Operational Copilot", shortLabel: "Copilot", description: "Memory-driven conversational guidance grounded in live operational context.", status: "Live", group: "Core", memoryRole: "Conversational continuity and context recall" },
  { href: "/operational-memory", label: "Operational Memory", shortLabel: "Memory", description: "Persistent organizational memory, timelines, and structured operational recall.", status: "Live", group: "Core", memoryRole: "System of record for operational intelligence" },
  { href: "/input-hub", label: "Operational Input", shortLabel: "Input", description: "Ingest delivery, stakeholder, and governance signals into shared memory.", status: "Live", group: "Core", memoryRole: "Primary intake into operational memory" },
  { href: "/executive", label: "Executive Intelligence", shortLabel: "Executive", description: "Executive synthesis, escalation posture, and operational confidence signals.", status: "Live", group: "Intelligence", memoryRole: "Decision-layer synthesis from memory and alerts" },
  { href: "/stakeholder-intel", label: "Stakeholder Intelligence", shortLabel: "Stakeholders", description: "Relationship risk, influence dynamics, and stakeholder temperature trends.", status: "Live", group: "Intelligence", memoryRole: "Human-system signals attached to memory timeline" },
  { href: "/change-detection", label: "Change Detection", shortLabel: "Changes", description: "Detect movement, deterioration, and pattern shifts across operational streams.", status: "Live", group: "Intelligence", memoryRole: "Temporal intelligence over memory deltas" },
  { href: "/command-center", label: "Command Center", shortLabel: "Command", description: "Coordinate interventions and escalation response for high-severity conditions.", status: "Live", group: "Execution", memoryRole: "Intervention control informed by memory + synthesis" },
  { href: "/follow-up-dashboard", label: "Follow-up Operations", shortLabel: "Follow-up", description: "Track actions, owners, and operational closure quality over time.", status: "Live", group: "Execution", memoryRole: "Execution evidence written back into memory" },
  { href: "/projects", label: "Project Workspaces", shortLabel: "Projects", description: "Program and project operational contexts linked to shared organizational memory.", status: "Live", group: "Execution", memoryRole: "Scoped delivery contexts linked to global memory" },
  { href: "/early-access", label: "Founder Early Access", shortLabel: "Early Access", description: "Invite distribution, trial state, and activation visibility for controlled rollout.", status: "New", group: "System", memoryRole: "Founder-led adoption telemetry and workspace activation status" },
  { href: "/team", label: "Governance & Access", shortLabel: "Settings", description: "Workspace governance, role controls, and operational access policy.", status: "Live", group: "System", memoryRole: "Governed usage of organizational memory" },
];

export const MODULE_GROUP_LABELS: Record<PMModule["group"], string> = {
  Core: "Operational Core",
  Intelligence: "Intelligence Layer",
  Execution: "Execution Layer",
  System: "Governance",
};

export const OPERATIONAL_FLOW = [
  "Operational Input",
  "Operational Memory",
  "Executive Synthesis",
  "Change Detection",
  "Intervention Recommendations",
  "Executive Visibility",
] as const;
