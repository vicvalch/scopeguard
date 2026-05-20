import type { DelegationInput } from "./delegated-capabilities";
import type { ExecutionGrantInput } from "./execution-grants";

export type RuntimePermission = string;
export type RuntimeWorkspaceRole = string;
export type RuntimeAuthUserContext = { id: string; [key: string]: unknown };
export type RuntimeGovernanceEvaluationInput = any;
export type RuntimeEnterpriseDecision = any;
export type RuntimeEnforcementResult = { decision: unknown; response: Response | null };
export type RuntimeAgentAccessInput = any;
export type RuntimeAgentScopeInput = any;

export type RuntimeAuthorityProviderKind = "in_process" | "external_sdk" | "remote_service" | "federated";
export type RuntimeAuthorityProviderMetadata = { authorityProviderKind: RuntimeAuthorityProviderKind; authorityProviderId: string; authoritySource: string; delegatedTo?: string; failClosed: boolean; runtimeVersion?: string; reason?: string };
export type RuntimeAuthorityPortResult<T> = T & { authorityProvider: RuntimeAuthorityProviderMetadata };
export class RuntimeAuthorityDependencyError extends Error {}
export class RuntimeAuthorityUnavailableError extends Error {}

export interface RuntimeAuthorityPort {
  getProviderMetadata(): RuntimeAuthorityProviderMetadata;
  authorizeAction(input: RuntimeGovernanceEvaluationInput): Promise<RuntimeAuthorityPortResult<RuntimeEnterpriseDecision>>;
  enforceAuthorization(input: RuntimeGovernanceEvaluationInput): Promise<RuntimeAuthorityPortResult<RuntimeEnforcementResult>>;
  issueExecutionGrant(input: ExecutionGrantInput): Promise<RuntimeAuthorityPortResult<any>>;
  consumeExecutionGrant(input: ExecutionGrantInput): Promise<RuntimeAuthorityPortResult<any>>;
  verifyExecutionGrant(input: ExecutionGrantInput): Promise<RuntimeAuthorityPortResult<any>>;
  issueDelegatedCapability(input: DelegationInput): Promise<RuntimeAuthorityPortResult<any>>;
  consumeDelegatedCapability(input: DelegationInput): Promise<RuntimeAuthorityPortResult<any>>;
  revokeDelegatedCapability(input: DelegationInput): Promise<RuntimeAuthorityPortResult<any>>;
  evaluateDelegatedAccess(input: DelegationInput): Promise<RuntimeAuthorityPortResult<any>>;
  resolveAuthorityChain(input: any): Promise<RuntimeAuthorityPortResult<any>>;
  validateDelegatedCapability(input: DelegationInput): Promise<RuntimeAuthorityPortResult<any>>;
  evaluateAgentAccess(input: RuntimeAgentAccessInput): Promise<RuntimeAuthorityPortResult<any>>;
  requireAgentScope(input: RuntimeAgentScopeInput): Promise<RuntimeAuthorityPortResult<any>>;
  grantAgentScope(input: RuntimeAgentScopeInput): Promise<RuntimeAuthorityPortResult<any>>;
  requireWorkspaceMembership(workspaceId: string): Promise<RuntimeAuthorityPortResult<{ user: RuntimeAuthUserContext; workspaceId: string; role: RuntimeWorkspaceRole }>>;
  requireWorkspaceRole(workspaceId: string, allowedRoles: RuntimeWorkspaceRole[]): Promise<RuntimeAuthorityPortResult<any>>;
  requireProjectAccess(projectId: string): Promise<RuntimeAuthorityPortResult<any>>;
  requireProjectPermission(projectId: string, permission: RuntimePermission): Promise<RuntimeAuthorityPortResult<any>>;
  requireGovernancePermission(workspaceId: string, permission: RuntimePermission): Promise<RuntimeAuthorityPortResult<any>>;
}

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
