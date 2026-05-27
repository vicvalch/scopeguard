export type DerivedLensType = "summary" | "execution" | "executive" | "portfolio" | "memory";

export type DerivedLensMetadata = {
  route: string;
  title: string;
  displayLabel: string;
  breadcrumbLabel: string;
  parent: "/workspace";
  lensType: DerivedLensType;
};

export const DERIVED_LENS_METADATA: DerivedLensMetadata[] = [
  { route: "/dashboard", title: "Summary", displayLabel: "Summary", breadcrumbLabel: "Summary", parent: "/workspace", lensType: "summary" },
  { route: "/command-center", title: "Execution", displayLabel: "Execution", breadcrumbLabel: "Execution", parent: "/workspace", lensType: "execution" },
  { route: "/executive", title: "Executive", displayLabel: "Executive", breadcrumbLabel: "Executive", parent: "/workspace", lensType: "executive" },
  { route: "/portfolio", title: "Portfolio", displayLabel: "Portfolio", breadcrumbLabel: "Portfolio", parent: "/workspace", lensType: "portfolio" },
  { route: "/operational-memory", title: "Memory", displayLabel: "Memory", breadcrumbLabel: "Memory", parent: "/workspace", lensType: "memory" },
  { route: "/stakeholder-intel", title: "Stakeholders", displayLabel: "Stakeholders", breadcrumbLabel: "Stakeholders", parent: "/workspace", lensType: "memory" },
];
