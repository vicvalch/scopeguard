import { ensurePmfreakAocAdaptersRegistered } from "@/lib/aoc/bootstrap";
import {
  buildAuthorityLineage,
  explainDelegationChain,
  resolveAuthorityChain as _resolveAuthorityChain,
  evaluateDelegatedAccess as _evaluateDelegatedAccess,
  issueDelegatedCapability as _issueDelegatedCapability,
  validateDelegatedCapability as _validateDelegatedCapability,
  revokeDelegatedCapability as _revokeDelegatedCapability,
  consumeDelegatedCapability as _consumeDelegatedCapability,
} from "@/aoc/enterprise/runtime/delegated-capabilities";

export { buildAuthorityLineage, explainDelegationChain };
export type { DelegationConstraints, DelegationDecision } from "@/aoc/enterprise/runtime/delegated-capabilities";

export async function resolveAuthorityChain(...args: Parameters<typeof _resolveAuthorityChain>) {
  ensurePmfreakAocAdaptersRegistered();
  return _resolveAuthorityChain(...args);
}

export async function evaluateDelegatedAccess(...args: Parameters<typeof _evaluateDelegatedAccess>) {
  ensurePmfreakAocAdaptersRegistered();
  return _evaluateDelegatedAccess(...args);
}

export async function issueDelegatedCapability(...args: Parameters<typeof _issueDelegatedCapability>) {
  ensurePmfreakAocAdaptersRegistered();
  return _issueDelegatedCapability(...args);
}

export async function validateDelegatedCapability(...args: Parameters<typeof _validateDelegatedCapability>) {
  ensurePmfreakAocAdaptersRegistered();
  return _validateDelegatedCapability(...args);
}

export async function revokeDelegatedCapability(...args: Parameters<typeof _revokeDelegatedCapability>) {
  ensurePmfreakAocAdaptersRegistered();
  return _revokeDelegatedCapability(...args);
}

export async function consumeDelegatedCapability(...args: Parameters<typeof _consumeDelegatedCapability>) {
  ensurePmfreakAocAdaptersRegistered();
  return _consumeDelegatedCapability(...args);
}
