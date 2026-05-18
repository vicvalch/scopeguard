// AOC Enterprise Runtime: explicit runtime composition root.
// This is the only enterprise-runtime module allowed to read from the runtime
// adapter registry. All orchestration modules receive RuntimeContext explicitly.

import { getAocAdapter } from "../../runtime/adapters";
import type { CapabilityClaimPorts } from "../../protocol/ports/capability-verification";
import {
  runtimeContextToCapabilityClaimPorts,
  runtimeContextToCapabilityVerificationPorts,
  type RuntimeContext,
  type RuntimeMetadata,
} from "./context";

export type ComposeRuntimeContextOptions = {
  metadata?: Partial<RuntimeMetadata>;
};

export function composeRuntimeContext(options: ComposeRuntimeContextOptions = {}): RuntimeContext {
  const trustDomain = getAocAdapter("trustDomain");
  const trustCoordination = getAocAdapter("trustCoordination");
  const securityAudit = getAocAdapter("securityAudit");
  const privilegedDb = getAocAdapter("privilegedDb");
  const accessVerification = getAocAdapter("accessVerification");
  const agentAttestation = getAocAdapter("agentAttestation");
  const policyEvaluator = getAocAdapter("policyEvaluator");
  const signer = {
    resolvePrivateSigningKey({ key }: Parameters<CapabilityClaimPorts["signer"]["resolvePrivateSigningKey"]>[0]) {
      if (!key.secret_ref) return null;
      return process.env[key.secret_ref] ?? null;
    },
  };

  return {
    trustDomain,
    trustCoordination,
    privilegedDb,
    securityAudit,
    accessVerification,
    agentAttestation,
    policyEvaluator,
    signer,
    security: {
      securityAudit,
      accessVerification,
      agentAttestation,
      signer,
    },
    governance: {
      policyEvaluator,
      privilegedDb,
    },
    capability: {
      trustDomain,
      trustCoordination,
    },
    audit: {
      securityAudit,
    },
    metadata: {
      runtimeName: options.metadata?.runtimeName ?? "aoc-enterprise-runtime",
      compositionRoot: options.metadata?.compositionRoot ?? "aoc-enterprise/runtime/composition",
      composedAt: options.metadata?.composedAt ?? new Date().toISOString(),
    },
  };
}

export function composeCapabilityClaimPorts(runtime: RuntimeContext = composeRuntimeContext()): CapabilityClaimPorts {
  return runtimeContextToCapabilityClaimPorts(runtime);
}

export function composeCapabilityVerificationPorts(
  runtime: RuntimeContext = composeRuntimeContext(),
): Pick<CapabilityClaimPorts, "trustDomain" | "trustCoordination"> {
  return runtimeContextToCapabilityVerificationPorts(runtime);
}
