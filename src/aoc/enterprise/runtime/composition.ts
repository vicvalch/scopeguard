// AOC Enterprise Runtime: explicit protocol port composition.
// Enterprise runtime owns adapter-to-protocol wiring; protocol modules never resolve
// runtime registries or host application services themselves.

import { getAocAdapter } from "../../runtime/adapters";
import type { CapabilityClaimPorts } from "../../protocol/ports/capability-verification";

export function composeCapabilityClaimPorts(): CapabilityClaimPorts {
  return {
    trustDomain: getAocAdapter("trustDomain"),
    trustCoordination: getAocAdapter("trustCoordination"),
    securityAudit: getAocAdapter("securityAudit"),
    signer: {
      resolvePrivateSigningKey({ key }) {
        if (!key.secret_ref) return null;
        return process.env[key.secret_ref] ?? null;
      },
    },
  };
}

export function composeCapabilityVerificationPorts(): Pick<CapabilityClaimPorts, "trustDomain" | "trustCoordination"> {
  const ports = composeCapabilityClaimPorts();
  return {
    trustDomain: ports.trustDomain,
    trustCoordination: ports.trustCoordination,
  };
}
