export type PMModule = {
  href: string;
  label: string;
  shortLabel: string;
  description: string;
  status: "Live" | "New";
  group: "Core" | "Operations" | "System";
};

export const PM_MODULES: PMModule[] = [
  { href: "/dashboard", label: "Home", shortLabel: "Home", description: "Current operational state and workflow overview.", status: "Live", group: "Core" },
  { href: "/projects", label: "Projects", shortLabel: "Projects", description: "Project workspaces, ownership, and scope control.", status: "Live", group: "Core" },
  { href: "/input-hub", label: "Input Hub", shortLabel: "Input", description: "Daily operational ingestion into operational memory.", status: "Live", group: "Operations" },
  { href: "/executive", label: "Executive", shortLabel: "Executive", description: "Executive operational intelligence and synthesis.", status: "Live", group: "Operations" },
  { href: "/follow-up-dashboard", label: "Follow-up", shortLabel: "Follow-up", description: "Action tracking, ownership, and follow-up closure.", status: "Live", group: "Operations" },
  { href: "/change-detection", label: "Change Detection", shortLabel: "Changes", description: "Temporal movement, deterioration, and escalation shifts.", status: "Live", group: "Operations" },
  { href: "/command-center", label: "Command Center", shortLabel: "Command", description: "High-severity operational monitoring and intervention prioritization.", status: "Live", group: "Operations" },
  { href: "/team", label: "Settings", shortLabel: "Settings", description: "Workspace team, PMO governance, and access preferences.", status: "Live", group: "System" },
];

export const OPERATIONAL_FLOW = [
  "Operational Input",
  "Operational Memory",
  "Executive Synthesis",
  "Change Detection",
  "Intervention Recommendations",
  "Executive Visibility",
] as const;
