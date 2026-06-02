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
  issueExecutionGrant(input: ExecutionGrantInput): Promise<RuntimeAuthorityPortResult<Record<string, unknown>>>;
  consumeExecutionGrant(input: ExecutionGrantInput): Promise<RuntimeAuthorityPortResult<Record<string, unknown>>>;
  verifyExecutionGrant(input: ExecutionGrantInput): Promise<RuntimeAuthorityPortResult<Record<string, unknown>>>;
  issueDelegatedCapability(input: DelegationInput): Promise<RuntimeAuthorityPortResult<Record<string, unknown>>>;
  consumeDelegatedCapability(input: DelegationInput): Promise<RuntimeAuthorityPortResult<Record<string, unknown>>>;
  revokeDelegatedCapability(input: DelegationInput): Promise<RuntimeAuthorityPortResult<Record<string, unknown>>>;
  evaluateDelegatedAccess(input: DelegationInput): Promise<RuntimeAuthorityPortResult<Record<string, unknown>>>;
  resolveAuthorityChain(input: Record<string, unknown>): Promise<RuntimeAuthorityPortResult<Record<string, unknown>>>;
  validateDelegatedCapability(input: DelegationInput): Promise<RuntimeAuthorityPortResult<Record<string, unknown>>>;
  evaluateAgentAccess(input: RuntimeAgentAccessInput): Promise<RuntimeAuthorityPortResult<Record<string, unknown>>>;
  requireAgentScope(input: RuntimeAgentScopeInput): Promise<RuntimeAuthorityPortResult<Record<string, unknown>>>;
  grantAgentScope(input: RuntimeAgentScopeInput): Promise<RuntimeAuthorityPortResult<Record<string, unknown>>>;
  requireWorkspaceMembership(workspaceId: string): Promise<RuntimeAuthorityPortResult<{ user: RuntimeAuthUserContext; workspaceId: string; role: RuntimeWorkspaceRole }>>;
  requireWorkspaceRole(workspaceId: string, allowedRoles: RuntimeWorkspaceRole[]): Promise<RuntimeAuthorityPortResult<Record<string, unknown>>>;
  requireProjectAccess(projectId: string): Promise<RuntimeAuthorityPortResult<Record<string, unknown>>>;
  requireProjectPermission(projectId: string, permission: RuntimePermission): Promise<RuntimeAuthorityPortResult<Record<string, unknown>>>;
  requireGovernancePermission(workspaceId: string, permission: RuntimePermission): Promise<RuntimeAuthorityPortResult<Record<string, unknown>>>;
}
