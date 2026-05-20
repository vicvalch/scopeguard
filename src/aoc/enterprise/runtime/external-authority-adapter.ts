import { RuntimeAuthorityUnavailableError, type RuntimeAuthorityPort, type RuntimeAuthorityProviderKind, type RuntimeAuthorityProviderMetadata } from "./authority-port";

export class ExternalRuntimeAuthorityAdapter implements RuntimeAuthorityPort {
  constructor(private readonly kind: Extract<RuntimeAuthorityProviderKind, "external_sdk" | "remote_service" | "federated">) {}
  private metadata(): RuntimeAuthorityProviderMetadata {
    return { authorityProviderKind: this.kind, authorityProviderId: `pmfreak.${this.kind}`, authoritySource: "external-runtime", delegatedTo: "external-runtime", failClosed: true, reason: "external_runtime_not_configured" };
  }
  getProviderMetadata() { return this.metadata(); }
  private unavailable(): never { throw new RuntimeAuthorityUnavailableError("external_runtime_not_configured"); }
  async authorizeAction(input: any): Promise<any> { return this.unavailable(); }
  async enforceAuthorization(input: any): Promise<any> { return this.unavailable(); }
  async issueExecutionGrant(input: any): Promise<any> { return this.unavailable(); }
  async consumeExecutionGrant(input: any): Promise<any> { return this.unavailable(); }
  async verifyExecutionGrant(input: any): Promise<any> { return this.unavailable(); }
  async issueDelegatedCapability(input: any): Promise<any> { return this.unavailable(); }
  async consumeDelegatedCapability(input: any): Promise<any> { return this.unavailable(); }
  async revokeDelegatedCapability(input: any): Promise<any> { return this.unavailable(); }
  async evaluateDelegatedAccess(input: any): Promise<any> { return this.unavailable(); }
  async resolveAuthorityChain(input: any): Promise<any> { return this.unavailable(); }
  async validateDelegatedCapability(input: any): Promise<any> { return this.unavailable(); }
  async evaluateAgentAccess(input: any): Promise<any> { return this.unavailable(); }
  async requireAgentScope(input: any): Promise<any> { return this.unavailable(); }
  async grantAgentScope(input: any): Promise<any> { return this.unavailable(); }
  async requireWorkspaceMembership(workspaceId: string): Promise<any> { return this.unavailable(); }
  async requireWorkspaceRole(workspaceId: string, allowedRoles: any[]): Promise<any> { return this.unavailable(); }
  async requireProjectAccess(projectId: string): Promise<any> { return this.unavailable(); }
  async requireProjectPermission(projectId: string, permission: any): Promise<any> { return this.unavailable(); }
  async requireGovernancePermission(workspaceId: string, permission: any): Promise<any> { return this.unavailable(); }
}
