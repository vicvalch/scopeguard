import type { GovernanceEvaluationInput } from "@/lib/aoc/enterprise/runtime";
import type { ExecutionGrantInput } from "@/lib/security/execution-grants";
import type { DelegationInput } from "@/lib/security/delegated-capabilities";
import type { Permission, WorkspaceRole } from "@/lib/security/rbac";
import type { AuthUserContext } from "@/lib/auth";
import type { EnterpriseRuntimeDecision } from "@/lib/aoc/enterprise/authorization";
import type { evaluateAgentAccess, requireAgentScope } from "@/lib/security/agent-access";

export type RuntimeAuthorityProviderKind = "in_process" | "external_sdk" | "remote_service" | "federated";
export type RuntimeAuthorityProviderMetadata = { authorityProviderKind: RuntimeAuthorityProviderKind; authorityProviderId: string; authoritySource: string; delegatedTo?: string; failClosed: boolean; runtimeVersion?: string; reason?: string };
export type RuntimeAuthorityPortResult<T> = T & { authorityProvider: RuntimeAuthorityProviderMetadata };
export class RuntimeAuthorityDependencyError extends Error {}
export class RuntimeAuthorityUnavailableError extends Error {}

export interface RuntimeAuthorityPort {
  getProviderMetadata(): RuntimeAuthorityProviderMetadata;
  authorizeAction(input: GovernanceEvaluationInput): Promise<RuntimeAuthorityPortResult<EnterpriseRuntimeDecision>>;
  enforceAuthorization(input: GovernanceEvaluationInput): Promise<RuntimeAuthorityPortResult<{ decision: any; response: Response | null }>>;
  issueExecutionGrant(input: ExecutionGrantInput): Promise<RuntimeAuthorityPortResult<any>>;
  consumeExecutionGrant(input: ExecutionGrantInput): Promise<RuntimeAuthorityPortResult<any>>;
  verifyExecutionGrant(input: ExecutionGrantInput): Promise<RuntimeAuthorityPortResult<any>>;
  issueDelegatedCapability(input: DelegationInput): Promise<RuntimeAuthorityPortResult<any>>;
  consumeDelegatedCapability(input: DelegationInput): Promise<RuntimeAuthorityPortResult<any>>;
  revokeDelegatedCapability(input: DelegationInput): Promise<RuntimeAuthorityPortResult<any>>;
  evaluateDelegatedAccess(input: DelegationInput): Promise<RuntimeAuthorityPortResult<any>>;
  resolveAuthorityChain(input: any): Promise<RuntimeAuthorityPortResult<any>>;
  validateDelegatedCapability(input: DelegationInput): Promise<RuntimeAuthorityPortResult<any>>;
  evaluateAgentAccess(input: Parameters<typeof evaluateAgentAccess>[0]): Promise<RuntimeAuthorityPortResult<any>>;
  requireAgentScope(input: Parameters<typeof requireAgentScope>[0]): Promise<RuntimeAuthorityPortResult<any>>;
  requireWorkspaceMembership(workspaceId: string): Promise<RuntimeAuthorityPortResult<{ user: AuthUserContext; workspaceId: string; role: WorkspaceRole }>>;
  requireWorkspaceRole(workspaceId: string, allowedRoles: WorkspaceRole[]): Promise<RuntimeAuthorityPortResult<any>>;
  requireProjectAccess(projectId: string): Promise<RuntimeAuthorityPortResult<any>>;
  requireProjectPermission(projectId: string, permission: Permission): Promise<RuntimeAuthorityPortResult<any>>;
  requireGovernancePermission(workspaceId: string, permission: Permission): Promise<RuntimeAuthorityPortResult<any>>;
}
