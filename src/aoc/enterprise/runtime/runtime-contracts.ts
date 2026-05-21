import type { DelegationInput, ExecutionGrantInput } from "./runtime-input-contracts";

export type RuntimePermission = string;
export type RuntimeWorkspaceRole = string;
export type RuntimeAuthUserContext = { id: string; [key: string]: unknown };

// TRANSITIONAL: kept intentionally broad during Runtime Contracts Extraction.
// Future PRs will narrow this once all adapters consume canonical contracts.
export type RuntimeGovernanceEvaluationInput = any;

// TRANSITIONAL: kept intentionally broad during Runtime Contracts Extraction.
// Future PRs will narrow this once all adapters consume canonical contracts.
export type RuntimeEnterpriseDecision = any;

export type RuntimeEnforcementResult = { decision: unknown; response: Response | null };

// TRANSITIONAL: kept intentionally broad during Runtime Contracts Extraction.
// Future PRs will narrow this once all adapters consume canonical contracts.
export type RuntimeAgentAccessInput = any;

// TRANSITIONAL: kept intentionally broad during Runtime Contracts Extraction.
// Future PRs will narrow this once all adapters consume canonical contracts.
export type RuntimeAgentScopeInput = any;

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
