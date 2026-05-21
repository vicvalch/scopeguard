import type { DelegationInput, ExecutionGrantInput } from "./runtime-input-contracts";
import type {
  RuntimeAgentAccessInput,
  RuntimeAgentScopeInput,
  RuntimeAuthUserContext,
  RuntimeAuthorityPortResult,
  RuntimeAuthorityProviderMetadata,
  RuntimeEnterpriseDecision,
  RuntimeEnforcementResult,
  RuntimeGovernanceEvaluationInput,
  RuntimePermission,
  RuntimeWorkspaceRole,
} from "./runtime-contracts";

export type {
  InProcessAuthorityDependencies,
  RuntimeAgentAccessInput,
  RuntimeAgentScopeInput,
  RuntimeAuthUserContext,
  RuntimeAuthorityPortResult,
  RuntimeAuthorityProviderKind,
  RuntimeAuthorityProviderMetadata,
  RuntimeEnterpriseDecision,
  RuntimeEnforcementResult,
  RuntimeGovernanceEvaluationInput,
  RuntimePermission,
  RuntimeWorkspaceRole,
} from "./runtime-contracts";
export { RuntimeAuthorityDependencyError, RuntimeAuthorityUnavailableError } from "./runtime-contracts";

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
