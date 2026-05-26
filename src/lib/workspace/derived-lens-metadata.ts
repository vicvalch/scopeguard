export type DerivedLensType = "summary" | "execution" | "executive" | "portfolio" | "memory";

export type DerivedLensMetadata = {
  route: string;
  title: string;
  parent: "/workspace";
  lensType: DerivedLensType;
};

export const DERIVED_LENS_METADATA: DerivedLensMetadata[] = [
  { route: "/dashboard", title: "Operational Summary Lens", parent: "/workspace", lensType: "summary" },
  { route: "/command-center", title: "Execution Coordination Lens", parent: "/workspace", lensType: "execution" },
  { route: "/executive", title: "Executive Insight Lens", parent: "/workspace", lensType: "executive" },
  { route: "/portfolio", title: "Portfolio Intelligence Lens", parent: "/workspace", lensType: "portfolio" },
  { route: "/operational-memory", title: "Operational Memory Lens", parent: "/workspace", lensType: "memory" },
  { route: "/stakeholder-intel", title: "Stakeholder Intelligence Lens", parent: "/workspace", lensType: "memory" },
];
