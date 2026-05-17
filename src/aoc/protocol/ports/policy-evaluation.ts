// AOC Protocol: PolicyEvaluatorPort
// Future extraction boundary: replaces direct import of evaluatePolicyDecision from PMFreak.
// Host provides the full policy evaluation pipeline including DB access, auth context,
// grant/policy queries, and audit recording.
// Do NOT import from host application modules in this file.

export type PolicyDecision = "allow" | "deny" | "require_approval" | "expired" | "no_match";

export type PolicyEvaluationInput = {
  workspaceId?: string;
  resourceType: string;
  resourceId: string;
  permission: string;
  requestedDurationHours?: number;
  justification?: string;
  rbacAllowed: boolean;
};

export type PolicyEvaluationResult = {
  decision: PolicyDecision;
  reason: string;
  matchedPolicyIds: string[];
  matchedGrantId?: string;
  actorUserId: string;
  workspaceId: string | null;
  resourceType: string;
  resourceId: string;
  permission: string;
  evaluatedAt: string;
};

export interface PolicyEvaluatorPort {
  evaluatePolicyDecision(input: PolicyEvaluationInput): Promise<PolicyEvaluationResult>;
}
