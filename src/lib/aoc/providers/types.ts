import type { OperationalDomain, OperationalMemoryRecord } from "@/lib/operational-memory";

export type VaultScope = "workspace_vault" | "organizational_vault";

export type MemoryNamespace = {
  companyId: string;
  projectId: string | null;
  scope: VaultScope;
  governanceScope: "organization" | "workspace" | "project";
  namespaceKey: string;
};

export type ActorType = "human" | "machine";

export type ActorRole = "workspace_member" | "workspace_admin" | "executive" | "system";

export type GovernanceActor = {
  actorRef: string;
  actorType: ActorType;
  role: ActorRole;
  machineId: string | null;
};

export type GovernanceCapability =
  | "write_operational_memory"
  | "write_executive_context"
  | "write_stakeholder_intelligence"
  | "trigger_intervention"
  | "access_cross_project_memory"
  | "generate_executive_synthesis";

export type SaveOperationalMemoryInput = {
  namespace: MemoryNamespace;
  domain: OperationalDomain;
  title: string;
  text: string;
  sourceRef: string;
};

export interface MemoryProvider {
  listOperationalMemory(namespace: MemoryNamespace, domain?: OperationalDomain): Promise<OperationalMemoryRecord[]>;
  saveOperationalMemory(input: SaveOperationalMemoryInput): Promise<OperationalMemoryRecord>;
}

export interface AuditProvider {
  recordEvent(input: {
    namespace: MemoryNamespace;
    eventType: string;
    actor: GovernanceActor;
    payload: Record<string, unknown>;
  }): Promise<void>;
}

export interface VaultProvider {
  resolveMemoryNamespace(input: { companyId: string; projectId: string | null }): MemoryNamespace;
}

export interface PolicyProvider {
  canWriteOperationalMemory(input: { namespace: MemoryNamespace; actor: GovernanceActor; domain: OperationalDomain }): Promise<boolean>;
}

export type CapabilityEvaluation = {
  allowed: boolean;
  reason: string;
  source: string;
  evaluatedCapability: GovernanceCapability;
};

export interface CapabilityProvider {
  hasCapability(input: { namespace: MemoryNamespace; actor: GovernanceActor; capability: GovernanceCapability }): Promise<boolean>;
  evaluateCapability(input: { namespace: MemoryNamespace; actor: GovernanceActor; capability: GovernanceCapability }): Promise<CapabilityEvaluation>;
}
