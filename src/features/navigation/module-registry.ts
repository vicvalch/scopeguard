export type PMModule = {
  href: string;
  label: string;
  shortLabel: string;
  description: string;
  status: "Live" | "New";
};

export const PM_MODULES: PMModule[] = [
  { href: "/projects", label: "Projects", shortLabel: "Projects", description: "Project workspaces and ownership.", status: "Live" },
  { href: "/stakeholder-intel", label: "Stakeholders", shortLabel: "Stakeholders", description: "Signals, influence, and alignment tracking.", status: "Live" },
  { href: "/meetings", label: "Timeline", shortLabel: "Timeline", description: "Milestones, cadence, and meeting history.", status: "Live" },
  { href: "/political-risk", label: "Risks", shortLabel: "Risks", description: "Delivery and political risk awareness.", status: "Live" },
  { href: "/escalation-guide", label: "Decisions", shortLabel: "Decisions", description: "Escalation paths and decision records.", status: "Live" },
  { href: "/upload", label: "Documents", shortLabel: "Docs", description: "Drop files into project context memory.", status: "Live" },
];
