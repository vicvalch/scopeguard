import { ensurePmfreakAocAdaptersRegistered } from "@/lib/aoc/bootstrap";
import { composeRuntimeContext } from "@/aoc/enterprise/runtime";
import {
  buildAuthorityLineage,
  explainDelegationChain,
  resolveAuthorityChain as _resolveAuthorityChain,
  evaluateDelegatedAccess as _evaluateDelegatedAccess,
  issueDelegatedCapability as _issueDelegatedCapability,
  validateDelegatedCapability as _validateDelegatedCapability,
  revokeDelegatedCapability as _revokeDelegatedCapability,
  consumeDelegatedCapability as _consumeDelegatedCapability,
  type DelegationInput,
} from "@/aoc/enterprise/runtime/delegated-capabilities";

export { buildAuthorityLineage, explainDelegationChain };
export type { DelegationConstraints, DelegationDecision, DelegationInput } from "@/aoc/enterprise/runtime/delegated-capabilities";

export async function resolveAuthorityChain(input: Parameters<typeof _resolveAuthorityChain>[1]) {
  ensurePmfreakAocAdaptersRegistered();
  return _resolveAuthorityChain(composeRuntimeContext(), input);
}

export async function evaluateDelegatedAccess(input: DelegationInput) {
  ensurePmfreakAocAdaptersRegistered();
  return _evaluateDelegatedAccess(composeRuntimeContext(), input);
}

export async function issueDelegatedCapability(input: DelegationInput) {
  ensurePmfreakAocAdaptersRegistered();
  return _issueDelegatedCapability(composeRuntimeContext(), input);
}

export async function validateDelegatedCapability(input: DelegationInput) {
  ensurePmfreakAocAdaptersRegistered();
  return _validateDelegatedCapability(composeRuntimeContext(), input);
}

export async function revokeDelegatedCapability(input: DelegationInput) {
  ensurePmfreakAocAdaptersRegistered();
  return _revokeDelegatedCapability(composeRuntimeContext(), input);
}

export async function consumeDelegatedCapability(input: DelegationInput) {
  ensurePmfreakAocAdaptersRegistered();
  return _consumeDelegatedCapability(composeRuntimeContext(), input);
}
