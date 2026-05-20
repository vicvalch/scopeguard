import { evaluateAgentAccess as evaluateLegacyAgentAccess, grantAgentScope, requireAgentScope as requireLegacyAgentScope } from "@/lib/security/agent-access";
import { getRuntimeAuthorityPort } from "./authority-provider";

export { grantAgentScope };

export async function evaluateAgentAccess(input: Parameters<typeof evaluateLegacyAgentAccess>[0]) { return getRuntimeAuthorityPort().evaluateAgentAccess(input); }
export async function requireAgentScope(input: Parameters<typeof requireLegacyAgentScope>[0]) { return getRuntimeAuthorityPort().requireAgentScope(input); }
