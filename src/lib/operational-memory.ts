import { createDefaultAocProviders } from "@/lib/aoc/providers";
import { resolveGovernanceActor } from "@/lib/aoc/providers/governance";

export const OPERATIONAL_DOMAINS = [
  "stakeholder_intelligence",
  "delivery_intelligence",
  "risk_intelligence",
  "pmo_governance",
  "team_health",
  "executive_context",
  "operational_memory",
] as const;

export type OperationalDomain = (typeof OPERATIONAL_DOMAINS)[number];

type SourceTrace = { sourceType: "chat" | "document" | "system"; sourceRef: string; excerpt?: string };

export type OperationalMemoryRecord = {
  id: string;
  domain: OperationalDomain;
  title: string;
  data: Record<string, string>;
  confidenceScore: number;
  completionScore: number;
  missingFields: string[];
  extractedFacts: string[];
  sourceTrace: SourceTrace[];
  createdAt: string;
  updatedAt: string;
};

export const DOMAIN_FIELDS: Record<OperationalDomain, string[]> = {
  stakeholder_intelligence: ["name","role","organization","decision_power","influence_level","support_level","interests","communication_preference","escalation_behavior","political_risk","known_frictions","preferred_update_format","last_signal","confidence_score"],
  delivery_intelligence: ["milestones","blockers","dependencies","deadlines","delivery_confidence","critical_path_risks","recovery_options","current_status","confidence_score"],
  risk_intelligence: ["risk_name","category","severity","probability","impact","owner","mitigation","escalation_needed","current_status","confidence_score"],
  pmo_governance: ["methodology","escalation_rules","reporting_cadence","approval_rules","quality_gates","compliance_requirements","communication_standards","confidence_score"],
  team_health: ["pm_name","workload_level","after_hours_activity","meeting_pressure","context_switching","overload_signals","fatigue_risk","support_needed","confidence_score"],
  executive_context: ["sponsor","strategic_importance","budget_sensitivity","political_visibility","executive_expectations","decision_deadlines","escalation_sensitivity","confidence_score"],
  operational_memory: ["decision","event_type","date","source","affected_project","affected_stakeholders","implication","follow_up_needed","confidence_score"],
};

export function extractDomainFacts(domain: OperationalDomain, text: string) {
  const fields = DOMAIN_FIELDS[domain];
  const lowered = text.toLowerCase();
  const data: Record<string, string> = {};
  const facts: string[] = [];
  for (const field of fields) {
    if (field === "confidence_score") continue;
    if (lowered.includes(field.replaceAll("_", " ")) || lowered.includes(field)) {
      data[field] = "captured from operator message";
      facts.push(`${field} was referenced in chat`);
    }
  }
  const filled = Object.keys(data).length;
  const required = fields.filter((f) => f !== "confidence_score");
  const completionScore = Math.round((filled / required.length) * 100);
  const missingFields = required.filter((field) => !(field in data));
  const confidenceScore = Math.max(35, Math.min(95, 40 + filled * 6));
  data.confidence_score = String(confidenceScore);
  return { data, extractedFacts: facts, completionScore, missingFields, confidenceScore };
}

const providers = createDefaultAocProviders(extractDomainFacts);

export async function listOperationalMemory(companyId: string, projectId: string | null, domain?: OperationalDomain) {
  const namespace = providers.vaultProvider.resolveMemoryNamespace({ companyId, projectId });
  return providers.memoryProvider.listOperationalMemory(namespace, domain);
}

export async function saveOperationalMemory(input: { companyId: string; projectId: string | null; domain: OperationalDomain; title: string; text: string; sourceRef: string; }) {
  const namespace = providers.vaultProvider.resolveMemoryNamespace({ companyId: input.companyId, projectId: input.projectId });
  const actor = resolveGovernanceActor(input.sourceRef);
  const canWrite = await providers.policyProvider.canWriteOperationalMemory({ namespace, actor, domain: input.domain });
  if (!canWrite) {
    await providers.auditProvider.recordEvent({
      namespace,
      eventType: "operational_memory_write_denied",
      actor,
      payload: { domain: input.domain, title: input.title },
    });
    throw new Error("Unable to save operational memory: write policy denied");
  }

  const record = await providers.memoryProvider.saveOperationalMemory({
    namespace,
    domain: input.domain,
    title: input.title,
    text: input.text,
    sourceRef: input.sourceRef,
  });

  await providers.auditProvider.recordEvent({
    namespace,
    eventType: "operational_memory_saved",
    actor,
    payload: { id: record.id, domain: record.domain, title: record.title },
  });

  return record;
}
