import { registerInProcessAuthorityDependencies } from "@/aoc/enterprise/runtime/authority-provider";
import { authorizeRuntimeAction } from "@/lib/aoc/enterprise/authorization";
import { enforceRuntimeAuthorization } from "@/lib/aoc/enterprise/runtime";
import { consumeExecutionGrant, issueExecutionGrant, validateExecutionGrant } from "@/lib/security/execution-grants";
import { consumeDelegatedCapability, evaluateDelegatedAccess, issueDelegatedCapability, resolveAuthorityChain, revokeDelegatedCapability, validateDelegatedCapability } from "@/lib/security/delegated-capabilities";
import { evaluateAgentAccess, grantAgentScope, requireAgentScope } from "@/lib/security/agent-access";
import { requireGovernancePermission, requireProjectAccess, requireProjectPermission, requireWorkspaceMembership, requireWorkspaceRole } from "@/lib/security/access-guards";

let registered = false;

export function ensureInProcessAuthorityDependenciesRegistered() {
  if (registered) return;
  registerInProcessAuthorityDependencies({
    authorizeAction: authorizeRuntimeAction,
    enforceAuthorization: enforceRuntimeAuthorization,
    issueExecutionGrant,
    consumeExecutionGrant,
    verifyExecutionGrant: validateExecutionGrant,
    issueDelegatedCapability,
    consumeDelegatedCapability,
    revokeDelegatedCapability,
    evaluateDelegatedAccess,
    resolveAuthorityChain,
    validateDelegatedCapability,
    evaluateAgentAccess,
    requireAgentScope,
    grantAgentScope,
    requireWorkspaceMembership,
    requireWorkspaceRole,
    requireProjectAccess,
    requireProjectPermission,
    requireGovernancePermission,
  });
  registered = true;
}
