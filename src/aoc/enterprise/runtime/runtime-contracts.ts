import type { DelegationInput, ExecutionGrantInput } from "./runtime-input-contracts";

export type RuntimePermission = string;
export type RuntimeWorkspaceRole = string;
export type RuntimeAuthUserContext = { id: string; [key: string]: unknown };

// TRANSITIONAL: kept intentionally broad during Runtime Contracts Extraction.
// Future PRs will narrow this once all adapters consume canonical contracts.
export type RuntimeGovernanceEvaluationInput = {
  workspaceId?: string | null;
  actorType: "user" | "system" | "ai_agent";
  action?: string | null;
  requestedPermission?: string | null;
  projectId?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  actorUserId?: string | null;
  actorAgentId?: string | null;
  actorRole?: string | null;
  routeId: string;
  metadata?: Record<string, unknown>;
  agentToken?: string | null;
  systemActor?: string | null;
};

// TRANSITIONAL: compatibility-safe canonical envelope for enterprise runtime decisions.
// Optional fields intentionally preserve broad adapter/consumer interoperability.
export type RuntimeEnterpriseDecision = {
  allowed: boolean;
  decisionId: string;
  authority?: string;
  reason: string;
  requestedPermission?: string | null;
  action?: string | null;
  workspaceId?: string | null;
  projectId?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  actorUserId?: string | null;
  actorAgentId?: string | null;
  actorType?: "user" | "system" | "ai_agent";
  routeId?: string | null;
  runtimeVersion?: string | null;
  trustDomain?: string | null;
  evaluationTimestamp?: string;
  decisionSource?: string | null;
  authoritative?: boolean;
  runtimeMetadata?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  audit?: Record<string, unknown>;
  lineage?: {
    correlationId?: string;
    executionTraceId?: string;
    delegationLineage?: string[];
    decisionLineage?: string[];
    [key: string]: unknown;
  };
};

export type RuntimeEnforcementResult = { decision: unknown; response: Response | null };

// TRANSITIONAL: compatibility-safe canonical runtime agent access envelope.
// Optional fields intentionally preserve broad adapter/consumer interoperability.
export type RuntimeAgentAccessInput = {
  workspaceId: string;
  agentId?: string | null;
  actorAgentId?: string | null;
  actorUserId?: string | null;
  actorType?: "user" | "system" | "ai_agent";
  action?: string | null;
  requestedPermission?: RuntimePermission | string | null;
  permission?: RuntimePermission | string | null;
  projectId?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  routeId?: string | null;
  metadata?: Record<string, unknown>;
};

// TRANSITIONAL: compatibility-safe canonical runtime agent scope envelope.
// Optional fields intentionally preserve broad adapter/consumer interoperability.
export type RuntimeAgentScopeInput = {
  workspaceId: string;
  agentId?: string | null;
  actorAgentId?: string | null;
  actorUserId?: string | null;
  scope?: string | null;
  scopes?: string[];
  action?: string | null;
  requestedPermission?: RuntimePermission | string | null;
  permission?: RuntimePermission | string | null;
  projectId?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  routeId?: string | null;
  metadata?: Record<string, unknown>;
  expiresAt?: string | null;
  grantedByUserId?: string | null;
};

export type RuntimeAuthorityProviderKind = "in_process" | "external_sdk" | "remote_service" | "federated";
export type RuntimeAuthorityProviderMetadata = { authorityProviderKind: RuntimeAuthorityProviderKind; authorityProviderId: string; authoritySource: string; delegatedTo?: string; failClosed: boolean; runtimeVersion?: string; reason?: string };
export type RuntimeAuthorityPortResult<T> = T & { authorityProvider: RuntimeAuthorityProviderMetadata };

export class RuntimeAuthorityDependencyError extends Error {}
export class RuntimeAuthorityUnavailableError extends Error {}

export type InProcessAuthorityDependencies = {
  authorizeAction(input: RuntimeGovernanceEvaluationInput): Promise<any>;
  enforceAuthorization(input: RuntimeGovernanceEvaluationInput): Promise<any>;
  issueExecutionGrant(input: ExecutionGrantInput): Promise<any>;
  consumeExecutionGrant(input: ExecutionGrantInput): Promise<any>;
  verifyExecutionGrant(input: ExecutionGrantInput): Promise<any>;
  issueDelegatedCapability(input: DelegationInput): Promise<any>;
  consumeDelegatedCapability(input: DelegationInput): Promise<any>;
  revokeDelegatedCapability(input: DelegationInput): Promise<any>;
  evaluateDelegatedAccess(input: DelegationInput): Promise<any>;
  resolveAuthorityChain(input: any): Promise<any>;
  validateDelegatedCapability(input: DelegationInput): Promise<any>;
  evaluateAgentAccess(input: RuntimeAgentAccessInput): Promise<any>;
  requireAgentScope(input: RuntimeAgentScopeInput): Promise<any>;
  grantAgentScope(input: RuntimeAgentScopeInput): Promise<any>;
  requireWorkspaceMembership(workspaceId: string): Promise<any>;
  requireWorkspaceRole(workspaceId: string, allowedRoles: RuntimeWorkspaceRole[]): Promise<any>;
  requireProjectAccess(projectId: string): Promise<any>;
  requireProjectPermission(projectId: string, permission: RuntimePermission): Promise<any>;
  requireGovernancePermission(workspaceId: string, permission: RuntimePermission): Promise<any>;
};
