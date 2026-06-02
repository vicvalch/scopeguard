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
  issueExecutionGrant(input: ExecutionGrantInput): Promise<RuntimeAuthorityPortResult<unknown>>;
  consumeExecutionGrant(input: ExecutionGrantInput): Promise<RuntimeAuthorityPortResult<unknown>>;
  verifyExecutionGrant(input: ExecutionGrantInput): Promise<RuntimeAuthorityPortResult<unknown>>;
  issueDelegatedCapability(input: DelegationInput): Promise<RuntimeAuthorityPortResult<unknown>>;
  consumeDelegatedCapability(input: DelegationInput): Promise<RuntimeAuthorityPortResult<unknown>>;
  revokeDelegatedCapability(input: DelegationInput): Promise<RuntimeAuthorityPortResult<unknown>>;
  evaluateDelegatedAccess(input: DelegationInput): Promise<RuntimeAuthorityPortResult<unknown>>;
  resolveAuthorityChain(input: any): Promise<RuntimeAuthorityPortResult<unknown>>;
  validateDelegatedCapability(input: DelegationInput): Promise<RuntimeAuthorityPortResult<unknown>>;
  evaluateAgentAccess(input: RuntimeAgentAccessInput): Promise<RuntimeAuthorityPortResult<unknown>>;
  requireAgentScope(input: RuntimeAgentScopeInput): Promise<RuntimeAuthorityPortResult<unknown>>;
  grantAgentScope(input: RuntimeAgentScopeInput): Promise<RuntimeAuthorityPortResult<unknown>>;
  requireWorkspaceMembership(workspaceId: string): Promise<RuntimeAuthorityPortResult<{ user: RuntimeAuthUserContext; workspaceId: string; role: RuntimeWorkspaceRole }>>;
  requireWorkspaceRole(workspaceId: string, allowedRoles: RuntimeWorkspaceRole[]): Promise<RuntimeAuthorityPortResult<unknown>>;
  requireProjectAccess(projectId: string): Promise<RuntimeAuthorityPortResult<unknown>>;
  requireProjectPermission(projectId: string, permission: RuntimePermission): Promise<RuntimeAuthorityPortResult<unknown>>;
  requireGovernancePermission(workspaceId: string, permission: RuntimePermission): Promise<RuntimeAuthorityPortResult<unknown>>;
}
