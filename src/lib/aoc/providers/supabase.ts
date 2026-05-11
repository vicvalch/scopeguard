import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import type { OperationalDomain, OperationalMemoryRecord } from "@/lib/operational-memory";
import type {
  AuditProvider,
  CapabilityEvaluation,
  CapabilityProvider,
  GovernanceActor,
  GovernanceCapability,
  MemoryNamespace,
  MemoryProvider,
  PolicyProvider,
  SaveOperationalMemoryInput,
  VaultProvider,
} from "@/lib/aoc/providers/types";
import { evaluateCapabilityPolicy, requiredWriteCapability } from "@/lib/aoc/providers/governance";

type SourceTrace = { sourceType: "chat" | "document" | "system"; sourceRef: string; excerpt?: string };

type OperationalMemoryRow = {
  id: string;
  domain: OperationalDomain;
  title: string;
  data: Record<string, string> | null;
  confidence_score: number;
  completion_score: number;
  missing_fields: string[] | null;
  extracted_facts: string[] | null;
  source_trace: SourceTrace[] | null;
  created_at: string;
  updated_at: string;
};

const mapRecord = (row: OperationalMemoryRow): OperationalMemoryRecord => ({
  id: row.id,
  domain: row.domain,
  title: row.title,
  data: (row.data ?? {}) as Record<string, string>,
  confidenceScore: row.confidence_score,
  completionScore: row.completion_score,
  missingFields: row.missing_fields ?? [],
  extractedFacts: row.extracted_facts ?? [],
  sourceTrace: (row.source_trace ?? []) as SourceTrace[],
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class SupabaseMemoryProvider implements MemoryProvider {
  constructor(private readonly extractFacts: (domain: OperationalDomain, text: string) => { data: Record<string, string>; extractedFacts: string[]; completionScore: number; missingFields: string[]; confidenceScore: number }) {}

  async listOperationalMemory(namespace: MemoryNamespace, domain?: OperationalDomain): Promise<OperationalMemoryRecord[]> {
    const supabase = createSupabaseServerClient();
    let query = supabase.from("operational_memory_records").select("*").eq("company_id", namespace.companyId).order("updated_at", { ascending: false });
    if (namespace.projectId) query = query.eq("project_id", namespace.projectId);
    if (domain) query = query.eq("domain", domain);
    const { data, error } = await query;
    if (error) throw new Error(`Unable to list operational memory: ${error.message}`);
    return (data ?? []).map(mapRecord);
  }

  async saveOperationalMemory(input: SaveOperationalMemoryInput): Promise<OperationalMemoryRecord> {
    const extracted = this.extractFacts(input.domain, input.text);
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("operational_memory_records")
      .insert({
        company_id: input.namespace.companyId,
        project_id: input.namespace.projectId,
        domain: input.domain,
        title: input.title,
        data: extracted.data,
        confidence_score: extracted.confidenceScore,
        completion_score: extracted.completionScore,
        missing_fields: extracted.missingFields,
        extracted_facts: extracted.extractedFacts,
        source_trace: [{ sourceType: "chat", sourceRef: input.sourceRef, excerpt: input.text.slice(0, 240) }],
      })
      .select("*")
      .single();
    if (error) throw new Error(`Unable to save operational memory: ${error.message}`);
    return mapRecord(data);
  }
}

export class SupabaseVaultProvider implements VaultProvider {
  resolveMemoryNamespace(input: { companyId: string; projectId: string | null }): MemoryNamespace {
    const scope = input.projectId ? "workspace_vault" : "organizational_vault";
    return {
      companyId: input.companyId,
      projectId: input.projectId,
      scope,
      governanceScope: input.projectId ? "project" : "organization",
      namespaceKey: `${input.companyId}:${input.projectId ?? "org"}:${scope}`,
    };
  }
}

export class SupabasePolicyProvider implements PolicyProvider {
  constructor(private readonly capabilityProvider: CapabilityProvider) {}

  async canWriteOperationalMemory(input: { namespace: MemoryNamespace; actor: GovernanceActor; domain: OperationalDomain }): Promise<boolean> {
    if (input.namespace.projectId && !input.namespace.namespaceKey.includes(input.namespace.projectId)) return false;
    if (input.actor.actorType === "machine" && !input.actor.machineId) return false;
    const capability = requiredWriteCapability(input.domain);
    const decision = await this.capabilityProvider.evaluateCapability({ namespace: input.namespace, actor: input.actor, capability });
    return decision.allowed;
  }
}

export class SupabaseAuditProvider implements AuditProvider {
  async recordEvent(input: { namespace: MemoryNamespace; eventType: string; actor: GovernanceActor; payload: Record<string, unknown> }): Promise<void> {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.from("governance_audit_events").insert({
      company_id: input.namespace.companyId,
      project_id: input.namespace.projectId,
      namespace_key: input.namespace.namespaceKey,
      namespace_scope: input.namespace.governanceScope,
      event_type: input.eventType,
      actor_ref: input.actor.actorRef,
      actor_type: input.actor.actorType,
      actor_role: input.actor.role,
      machine_id: input.actor.machineId,
      payload: input.payload,
      occurred_at: new Date().toISOString(),
    });
    if (error) throw new Error(`Unable to record governance audit event: ${error.message}`);
  }
}

export class SupabaseCapabilityProvider implements CapabilityProvider {
  async evaluateCapability(input: { namespace: MemoryNamespace; actor: GovernanceActor; capability: GovernanceCapability }): Promise<CapabilityEvaluation> {
    return evaluateCapabilityPolicy(input);
  }

  async hasCapability(input: { namespace: MemoryNamespace; actor: GovernanceActor; capability: GovernanceCapability }): Promise<boolean> {
    const decision = await this.evaluateCapability(input);
    return decision.allowed;
  }
}

