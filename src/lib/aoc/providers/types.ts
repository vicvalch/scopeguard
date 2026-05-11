import type { OperationalDomain, OperationalMemoryRecord } from "@/lib/operational-memory";

export type VaultScope = "workspace_vault" | "organizational_vault";

export type MemoryNamespace = {
  companyId: string;
  projectId: string | null;
  scope: VaultScope;
  namespaceKey: string;
};

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
    actorRef: string;
    payload: Record<string, unknown>;
  }): Promise<void>;
}

export interface VaultProvider {
  resolveMemoryNamespace(input: { companyId: string; projectId: string | null }): MemoryNamespace;
}

export interface PolicyProvider {
  canWriteOperationalMemory(input: { namespace: MemoryNamespace; actorRef: string; domain: OperationalDomain }): Promise<boolean>;
}

export interface CapabilityProvider {
  hasCapability(input: { namespace: MemoryNamespace; capability: string }): Promise<boolean>;
}
