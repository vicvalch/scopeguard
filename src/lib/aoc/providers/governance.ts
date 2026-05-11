import type { GovernanceActor, GovernanceCapability, MemoryNamespace } from "@/lib/aoc/providers/types";
import type { OperationalDomain } from "@/lib/operational-memory";

const MACHINE_PREFIX = "machine:";
const USER_PREFIX = "user:";

const MACHINE_REGISTRY: Record<string, { role: GovernanceActor["role"]; capabilities: GovernanceCapability[] }> = {
  copilot_agent: {
    role: "system",
    capabilities: ["write_operational_memory"],
  },
  executive_synthesis_agent: {
    role: "executive",
    capabilities: ["write_operational_memory", "write_executive_context", "generate_executive_synthesis", "access_cross_project_memory"],
  },
  operational_ingestion_agent: {
    role: "system",
    capabilities: ["write_operational_memory", "write_stakeholder_intelligence"],
  },
};

const ROLE_CAPABILITIES: Record<GovernanceActor["role"], GovernanceCapability[]> = {
  workspace_member: ["write_operational_memory"],
  workspace_admin: ["write_operational_memory", "write_stakeholder_intelligence", "trigger_intervention"],
  executive: ["write_operational_memory", "write_executive_context", "write_stakeholder_intelligence", "access_cross_project_memory", "generate_executive_synthesis"],
  system: ["write_operational_memory"],
};

export function resolveGovernanceActor(actorRef: string): GovernanceActor {
  if (actorRef.startsWith(MACHINE_PREFIX)) {
    const machineId = actorRef.slice(MACHINE_PREFIX.length).trim();
    const machineProfile = MACHINE_REGISTRY[machineId] ?? { role: "system", capabilities: ["write_operational_memory"] };
    return { actorRef, actorType: "machine", role: machineProfile.role, machineId };
  }

  if (actorRef.startsWith(USER_PREFIX)) {
    return { actorRef, actorType: "human", role: "workspace_member", machineId: null };
  }

  if (actorRef.startsWith("exec:") || actorRef.includes("executive")) {
    return { actorRef, actorType: "human", role: "executive", machineId: null };
  }

  if (actorRef.startsWith("admin:")) {
    return { actorRef, actorType: "human", role: "workspace_admin", machineId: null };
  }

  return { actorRef, actorType: "human", role: "workspace_member", machineId: null };
}

export function canUseCapability(input: { namespace: MemoryNamespace; actor: GovernanceActor; capability: GovernanceCapability }): boolean {
  const byRole = ROLE_CAPABILITIES[input.actor.role] ?? [];
  const byMachine = input.actor.machineId ? (MACHINE_REGISTRY[input.actor.machineId]?.capabilities ?? []) : [];
  const merged = new Set<GovernanceCapability>([...byRole, ...byMachine]);

  if (!merged.has(input.capability)) return false;

  if (input.capability === "access_cross_project_memory" && input.namespace.governanceScope === "project" && input.namespace.projectId) {
    return false;
  }

  return true;
}

export function requiredWriteCapability(domain: OperationalDomain): GovernanceCapability {
  if (domain === "executive_context") return "write_executive_context";
  if (domain === "stakeholder_intelligence") return "write_stakeholder_intelligence";
  return "write_operational_memory";
}
