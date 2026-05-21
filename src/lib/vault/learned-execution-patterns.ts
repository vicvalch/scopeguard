import type { VaultEvidenceLineage, VaultNutrient, VaultNutrientType } from "@/lib/vault/digestive/types";

const MAX_EXECUTION_PATTERNS = 12;
const MAX_PATTERN_SUMMARIES = 6;
const MAX_PATTERN_EVIDENCE = 4;
const MAX_PATTERN_EVIDENCE_CHARS = 240;
const DEFAULT_LOOKBACK_DAYS = 21;

export type LearnedExecutionPatternRequest = {
  companyId: string;
  workspaceId: string;
  projectId?: string | null;
  activeDomain?: "delivery" | "risk" | "governance" | "stakeholder" | "financial" | "timeline" | "general";
  lookbackDays?: number;
  includeResolved?: boolean;
  maxPatterns?: number;
};

export type ExecutionPattern = {
  patternId: string;
  patternType: string;
  severity: "low" | "medium" | "high" | "critical";
  recurrenceCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  trend: "stable" | "increasing" | "decreasing";
  operationalImpactScore: number;
  explanation: string;
  representativeEvidence: string[];
  relatedStakeholders: string[];
  unresolvedCount: number;
};

export type LearnedExecutionPatternResult = {
  generatedAt: string;
  status: "ok" | "empty" | "degraded";
  patterns: ExecutionPattern[];
  chronicRisks: ExecutionPattern[];
  recurringEscalations: ExecutionPattern[];
  recurringDependencies: ExecutionPattern[];
  stakeholderInstabilityPatterns: ExecutionPattern[];
  operationalHealthScore: number;
  summary: string[];
  degradationReason?: string;
};

type RecurrenceProfile = {
  recurrenceFrequency: number;
  recurrenceDensity: number;
  unresolvedPersistence: number;
  trend: ExecutionPattern["trend"];
};

const SIGNAL_DOMAIN: Record<VaultNutrientType, LearnedExecutionPatternRequest["activeDomain"]> = {
  blocker_signal: "delivery",
  escalation_signal: "risk",
  dependency_signal: "delivery",
  governance_gap_signal: "governance",
  stakeholder_signal: "stakeholder",
  delivery_drift_signal: "timeline",
  timeline_pressure_signal: "timeline",
  risk_signal: "risk",
  financial_impediment_signal: "financial",
  decision_signal: "governance",
  commitment_signal: "delivery",
  recovery_signal: "delivery",
  contradiction_signal: "risk",
  ambiguity_signal: "risk",
};

const resolvedNutrient = (n: VaultNutrient): boolean => n.nutrientType === "recovery_signal" || /\b(resolved|closed|completed|unblocked|recovered)\b/i.test(n.summary);

const normalizeText = (value: string): string => value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

const summarizeEvidence = (evidence: VaultEvidenceLineage[]): string => {
  const snippet = evidence[0]?.excerpt ?? "";
  return normalizeText(snippet).slice(0, 96);
};

export function normalizePatternFingerprint(input: string): string {
  return normalizeText(input);
}

export function buildPatternFingerprint(nutrient: VaultNutrient): string {
  const stakeholders = Array.from(new Set((nutrient.evidence ?? []).map((e) => e.actorUserId).filter(Boolean))).sort().join(",");
  const evidenceKey = summarizeEvidence(nutrient.evidence);
  const domain = SIGNAL_DOMAIN[nutrient.nutrientType] ?? "general";
  return normalizePatternFingerprint(`${nutrient.nutrientType}:${evidenceKey}:${stakeholders}:${nutrient.projectId ?? "none"}:${domain}`);
}

export function groupRecurringOperationalSignals(nutrients: VaultNutrient[]): VaultNutrient[][] {
  const grouped = new Map<string, VaultNutrient[]>();
  for (const nutrient of nutrients) {
    const fp = buildPatternFingerprint(nutrient);
    const existing = grouped.get(fp) ?? [];
    existing.push(nutrient);
    grouped.set(fp, existing);
  }
  return [...grouped.values()];
}

export function calculatePatternRecurrence(nutrients: VaultNutrient[], lookbackDays: number): RecurrenceProfile {
  const timestamps = nutrients.map((n) => Date.parse(n.createdAt)).filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!timestamps.length) return { recurrenceFrequency: 0, recurrenceDensity: 0, unresolvedPersistence: 0, trend: "stable" };
  const recurrenceFrequency = nutrients.length;
  const recurrenceDensity = Number((nutrients.length / Math.max(1, lookbackDays)).toFixed(4));
  const unresolvedCount = nutrients.filter((n) => !resolvedNutrient(n)).length;
  const unresolvedPersistence = Number((unresolvedCount / nutrients.length).toFixed(4));
  const pivot = timestamps[0] + (timestamps[timestamps.length - 1] - timestamps[0]) / 2;
  const firstHalf = timestamps.filter((t) => t <= pivot).length;
  const secondHalf = timestamps.length - firstHalf;
  const trend = secondHalf > firstHalf ? "increasing" : secondHalf < firstHalf ? "decreasing" : "stable";
  return { recurrenceFrequency, recurrenceDensity, unresolvedPersistence, trend };
}

export function scoreExecutionPattern(input: { recurrenceCount: number; unresolvedDensity: number; escalationInvolvement: boolean; recencyDays: number; stakeholderRepetition: number; timelinePersistence: number; deliveryImpact: number; }): number {
  const recurrenceComponent = Math.min(1, input.recurrenceCount / 6) * 0.24;
  const unresolvedComponent = Math.min(1, input.unresolvedDensity) * 0.24;
  const escalationComponent = (input.escalationInvolvement ? 1 : 0) * 0.14;
  const recencyComponent = Math.max(0, 1 - input.recencyDays / 45) * 0.14;
  const stakeholderComponent = Math.min(1, input.stakeholderRepetition / 4) * 0.08;
  const timelineComponent = Math.min(1, input.timelinePersistence) * 0.08;
  const deliveryComponent = Math.min(1, input.deliveryImpact) * 0.08;
  return Number((Math.min(1, recurrenceComponent + unresolvedComponent + escalationComponent + recencyComponent + stakeholderComponent + timelineComponent + deliveryComponent) * 100).toFixed(2));
}

export function classifyExecutionPatternSeverity(input: { patternType: string; recurrenceCount: number; unresolvedCount: number; trend: ExecutionPattern["trend"]; }): ExecutionPattern["severity"] {
  const repeatedUnresolved = input.recurrenceCount >= 2 && input.unresolvedCount >= 2;
  if (input.patternType === "escalation_cycle" && repeatedUnresolved) return "critical";
  if (input.patternType === "chronic_blocker" && repeatedUnresolved) return "critical";
  if (input.patternType === "dependency_failure" && input.recurrenceCount >= 2) return "high";
  if (input.patternType === "governance_instability" && input.recurrenceCount >= 2) return "high";
  if (input.patternType === "stakeholder_friction" && input.recurrenceCount >= 2) return "medium";
  if (input.trend === "increasing" && input.unresolvedCount >= 2) return "high";
  return "low";
}

export function buildPatternSummary(patterns: ExecutionPattern[], healthScore: number): string[] {
  const lines = patterns.slice(0, MAX_PATTERN_SUMMARIES).map((pattern) => `${pattern.patternType.replaceAll("_", " ")} repeated ${pattern.recurrenceCount} times (${pattern.trend}) with ${pattern.unresolvedCount} unresolved signals.`);
  if (healthScore < 70) lines.push("Operational delivery health deteriorated due to chronic blockers and recurrence pressure.");
  return Array.from(new Set(lines)).slice(0, MAX_PATTERN_SUMMARIES);
}

const toPatternType = (nutrientType: VaultNutrientType): string => {
  if (nutrientType === "escalation_signal") return "escalation_cycle";
  if (nutrientType === "dependency_signal") return "dependency_failure";
  if (nutrientType === "governance_gap_signal") return "governance_instability";
  if (nutrientType === "stakeholder_signal") return "stakeholder_friction";
  if (nutrientType === "blocker_signal") return "chronic_blocker";
  if (nutrientType === "delivery_drift_signal" || nutrientType === "timeline_pressure_signal") return "timeline_drift";
  return "operational_recurrence";
};

const computeOperationalHealthScore = (patterns: ExecutionPattern[]): number => {
  const penalty = patterns.reduce((acc, pattern) => {
    const sev = pattern.severity === "critical" ? 16 : pattern.severity === "high" ? 10 : pattern.severity === "medium" ? 6 : 3;
    return acc + sev + Math.min(8, pattern.unresolvedCount * 1.5);
  }, 0);
  return Math.max(0, Math.min(100, Number((100 - penalty).toFixed(2))));
};

const emptyResult = (): LearnedExecutionPatternResult => ({ generatedAt: new Date().toISOString(), status: "empty", patterns: [], chronicRisks: [], recurringEscalations: [], recurringDependencies: [], stakeholderInstabilityPatterns: [], operationalHealthScore: 100, summary: [] });

export async function detectLearnedExecutionPatterns(request: LearnedExecutionPatternRequest): Promise<LearnedExecutionPatternResult> {
  const baseEmpty = emptyResult();
  try {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const supabase = await createSupabaseServerClient();
    const lookbackDays = Math.max(1, Math.min(request.lookbackDays ?? DEFAULT_LOOKBACK_DAYS, 90));
    const sinceIso = new Date(Date.now() - lookbackDays * 86_400_000).toISOString();
    const maxPatterns = Math.max(1, Math.min(request.maxPatterns ?? MAX_EXECUTION_PATTERNS, MAX_EXECUTION_PATTERNS));
    let query = supabase
      .from("vault_nutrients")
      .select("id,nutrient_type,summary,evidence,scoring,created_at,project_id,workspace_id")
      .eq("workspace_id", request.workspaceId)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(200);
    if (request.projectId) query = query.eq("project_id", request.projectId);
    const { data, error } = await query;
    if (error) return { ...baseEmpty, status: "degraded", degradationReason: `vault_query_failed:${error.message}` };
    const nutrients = ((data ?? []) as Array<{ id: string; nutrient_type: VaultNutrientType; summary: string; evidence: VaultEvidenceLineage[]; scoring: VaultNutrient["scoring"]; created_at: string; project_id: string | null; workspace_id: string; }>).map((row) => ({ id: row.id, nutrientType: row.nutrient_type, summary: row.summary ?? "", evidence: Array.isArray(row.evidence) ? row.evidence : [], scoring: row.scoring, entities: [], duplicateMergeCount: 0, workspaceId: row.workspace_id, projectId: row.project_id, digestionRunId: "", createdAt: row.created_at }));
    const scoped = nutrients.filter((n) => (request.includeResolved ? true : !resolvedNutrient(n))).filter((n) => !request.activeDomain || request.activeDomain === "general" || SIGNAL_DOMAIN[n.nutrientType] === request.activeDomain);
    if (!scoped.length) return baseEmpty;

    const groups = groupRecurringOperationalSignals(scoped).filter((g) => g.length >= 2);
    const patterns = groups.map((group, index) => {
      const recurrence = calculatePatternRecurrence(group, lookbackDays);
      const lastSeenAt = group.map((n) => n.createdAt).sort((a, b) => Date.parse(b) - Date.parse(a))[0];
      const firstSeenAt = group.map((n) => n.createdAt).sort((a, b) => Date.parse(a) - Date.parse(b))[0];
      const relatedStakeholders = Array.from(new Set(group.flatMap((n) => n.evidence.map((e) => e.actorUserId).filter(Boolean) as string[]))).slice(0, 6);
      const unresolvedCount = group.filter((n) => !resolvedNutrient(n)).length;
      const patternType = toPatternType(group[0].nutrientType);
      const timelinePersistence = group.some((n) => n.nutrientType === "timeline_pressure_signal" || n.nutrientType === "delivery_drift_signal") ? 1 : 0;
      const impact = scoreExecutionPattern({ recurrenceCount: recurrence.recurrenceFrequency, unresolvedDensity: recurrence.unresolvedPersistence, escalationInvolvement: group.some((n) => n.nutrientType === "escalation_signal"), recencyDays: Math.max(0, (Date.now() - Date.parse(lastSeenAt)) / 86_400_000), stakeholderRepetition: relatedStakeholders.length, timelinePersistence, deliveryImpact: group.some((n) => ["blocker_signal", "dependency_signal", "delivery_drift_signal"].includes(n.nutrientType)) ? 1 : 0.4 });
      const severity = classifyExecutionPatternSeverity({ patternType, recurrenceCount: recurrence.recurrenceFrequency, unresolvedCount, trend: recurrence.trend });
      const representativeEvidence = Array.from(new Set(group.flatMap((n) => n.evidence.map((e) => e.excerpt.replace(/\s+/g, " ").trim().slice(0, MAX_PATTERN_EVIDENCE_CHARS)).filter(Boolean)))).slice(0, MAX_PATTERN_EVIDENCE);
      const explanation = `Pattern ${patternType} repeated ${recurrence.recurrenceFrequency} times in ${lookbackDays} days with unresolved density ${recurrence.unresolvedPersistence.toFixed(2)}.`;
      return { patternId: `${patternType}:${index + 1}:${buildPatternFingerprint(group[0]).slice(0, 24)}`, patternType, severity, recurrenceCount: recurrence.recurrenceFrequency, firstSeenAt, lastSeenAt, trend: recurrence.trend, operationalImpactScore: impact, explanation, representativeEvidence, relatedStakeholders, unresolvedCount } satisfies ExecutionPattern;
    }).sort((a, b) => b.operationalImpactScore - a.operationalImpactScore || Date.parse(b.lastSeenAt) - Date.parse(a.lastSeenAt)).slice(0, maxPatterns);

    if (!patterns.length) return baseEmpty;
    const operationalHealthScore = computeOperationalHealthScore(patterns);
    const summary = buildPatternSummary(patterns, operationalHealthScore);
    return {
      generatedAt: new Date().toISOString(),
      status: "ok",
      patterns,
      chronicRisks: patterns.filter((p) => ["chronic_blocker", "timeline_drift", "governance_instability"].includes(p.patternType)),
      recurringEscalations: patterns.filter((p) => p.patternType === "escalation_cycle"),
      recurringDependencies: patterns.filter((p) => p.patternType === "dependency_failure"),
      stakeholderInstabilityPatterns: patterns.filter((p) => p.patternType === "stakeholder_friction"),
      operationalHealthScore,
      summary,
    };
  } catch (error) {
    return { ...baseEmpty, status: "degraded", degradationReason: error instanceof Error ? error.message : "execution_pattern_detection_failed" };
  }
}
