import { authorizeRuntimeAction } from "@/lib/aoc/enterprise/authorization";
import { enforceRuntimeAuthorization } from "@/lib/aoc/enterprise/runtime";
import { consumeExecutionGrant, issueExecutionGrant, validateExecutionGrant } from "@/lib/security/execution-grants";
import { consumeDelegatedCapability, evaluateDelegatedAccess, issueDelegatedCapability, resolveAuthorityChain, revokeDelegatedCapability, validateDelegatedCapability } from "@/lib/security/delegated-capabilities";
import { evaluateAgentAccess, requireAgentScope } from "@/lib/security/agent-access";
import { requireGovernancePermission, requireProjectAccess, requireProjectPermission, requireWorkspaceMembership, requireWorkspaceRole } from "@/lib/security/access-guards";
import type { RuntimeAuthorityPort, RuntimeAuthorityProviderMetadata } from "./authority-port";

const metadata: RuntimeAuthorityProviderMetadata = { authorityProviderKind: "in_process", authorityProviderId: "pmfreak.in-process", authoritySource: "enterprise-runtime", failClosed: true };

export class InProcessRuntimeAuthorityAdapter implements RuntimeAuthorityPort {
  getProviderMetadata() { return metadata; }
  private withProvider<T extends object>(result: T) { return { ...result, authorityProvider: metadata }; }
  async authorizeAction(input: Parameters<typeof authorizeRuntimeAction>[0]) { return this.withProvider(await authorizeRuntimeAction(input)); }
  async enforceAuthorization(input: Parameters<typeof enforceRuntimeAuthorization>[0]) { return this.withProvider(await enforceRuntimeAuthorization(input)); }
  async issueExecutionGrant(input: Parameters<typeof issueExecutionGrant>[0]) { return this.withProvider(await issueExecutionGrant(input)); }
  async consumeExecutionGrant(input: Parameters<typeof consumeExecutionGrant>[0]) { return this.withProvider(await consumeExecutionGrant(input)); }
  async verifyExecutionGrant(input: Parameters<typeof validateExecutionGrant>[0]) { return this.withProvider(await validateExecutionGrant(input)); }
  async issueDelegatedCapability(input: Parameters<typeof issueDelegatedCapability>[0]) { return this.withProvider(await issueDelegatedCapability(input)); }
  async consumeDelegatedCapability(input: Parameters<typeof consumeDelegatedCapability>[0]) { return this.withProvider(await consumeDelegatedCapability(input)); }
  async revokeDelegatedCapability(input: Parameters<typeof revokeDelegatedCapability>[0]) { return this.withProvider(await revokeDelegatedCapability(input)); }
  async evaluateDelegatedAccess(input: Parameters<typeof evaluateDelegatedAccess>[0]) { return this.withProvider(await evaluateDelegatedAccess(input)); }
  async resolveAuthorityChain(input: Parameters<typeof resolveAuthorityChain>[0]) { return this.withProvider(await resolveAuthorityChain(input)); }
  async validateDelegatedCapability(input: Parameters<typeof validateDelegatedCapability>[0]) { return this.withProvider(await validateDelegatedCapability(input)); }
  async evaluateAgentAccess(input: Parameters<typeof evaluateAgentAccess>[0]) { return this.withProvider(await evaluateAgentAccess(input)); }
  async requireAgentScope(input: Parameters<typeof requireAgentScope>[0]) { return this.withProvider(await requireAgentScope(input)); }
  async requireWorkspaceMembership(workspaceId: string) { return this.withProvider(await requireWorkspaceMembership(workspaceId)); }
  async requireWorkspaceRole(workspaceId: string, allowedRoles: Parameters<typeof requireWorkspaceRole>[1]) { return this.withProvider(await requireWorkspaceRole(workspaceId, allowedRoles)); }
  async requireProjectAccess(projectId: string) { return this.withProvider(await requireProjectAccess(projectId)); }
  async requireProjectPermission(projectId: string, permission: Parameters<typeof requireProjectPermission>[1]) { return this.withProvider(await requireProjectPermission(projectId, permission)); }
  async requireGovernancePermission(workspaceId: string, permission: Parameters<typeof requireGovernancePermission>[1]) { return this.withProvider(await requireGovernancePermission(workspaceId, permission)); }
}
