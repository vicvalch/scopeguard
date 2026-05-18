import type { InferenceRequest } from "@/lib/ai/inference/types";

export type DataSensitivity = "public" | "internal" | "confidential" | "restricted";
export type ProviderTrustTier = "trusted" | "conditional" | "restricted";
export type EgressDecision = "allow" | "deny" | "conditional";

export interface AIEgressRequest {
  actor: NonNullable<InferenceRequest["actor"]>;
  provider: string;
  model?: string;
  workspaceId?: string;
  projectId?: string;
  moduleId?: string;
  estimatedSensitivity?: DataSensitivity;
  dataClasses?: string[];
  messageCount?: number;
  tokenEstimate?: number;
  purpose?: string;
}

export interface AIEgressDecision {
  decision: EgressDecision;
  reason: string;
  policyId?: string;
  enforcementLevel: "hard" | "soft";
  auditRequired: boolean;
}
