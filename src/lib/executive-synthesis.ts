import { listOperationalMemory, OPERATIONAL_DOMAINS, type OperationalDomain, type OperationalMemoryRecord } from "@/lib/operational-memory";
import { buildExecutiveInterventions, type ExecutiveInterventionRecommendation } from "@/lib/intervention-engine";
import { calculateOperationalTrends, generateExecutiveTimeline, type ExecutiveTimelineEvent, type OperationalTrend } from "@/lib/executive-timeline";
import { computeEscalationLevel, computeOperationalCoherence, computeProjectHealth, type EscalationLevel, type OperationalCoherenceScore, type ProjectHealthScore } from "@/lib/executive-health";

export type OperationalSignal = {
  id: string;
  signalType: "stakeholder_pressure" | "delivery_risk" | "pm_fatigue" | "governance_failure";
  score: number;
  domain: OperationalDomain;
  confidence: number;
};

export type StakeholderPressureSignal = OperationalSignal & { signalType: "stakeholder_pressure" };
export type DeliveryRiskSignal = OperationalSignal & { signalType: "delivery_risk" };
export type PMFatigueSignal = OperationalSignal & { signalType: "pm_fatigue" };
export type GovernanceFailureSignal = OperationalSignal & { signalType: "governance_failure" };

export type EscalationRisk = { level: EscalationLevel; probabilityScore: number; triggers: string[] };

export type ExecutiveInsight = {
  id: string;
  title: string;
  summary: string;
  relatedDomains: OperationalDomain[];
  confidence: number;
};

export type ExecutiveSynthesisSnapshot = {
  generatedAt: string;
  recordsProcessed: number;
  health: ProjectHealthScore;
  coherence: OperationalCoherenceScore;
  escalationRisk: EscalationRisk;
  signals: OperationalSignal[];
  insights: ExecutiveInsight[];
  interventions: ExecutiveInterventionRecommendation[];
  timeline: ExecutiveTimelineEvent[];
  trends: OperationalTrend[];
  weakestDomains: Array<{ domain: OperationalDomain; score: number }>;
  missingInformationWarnings: string[];
};

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const avg = (items: number[]) => (items.length ? items.reduce((a, b) => a + b, 0) / items.length : 0);

function scoreDomainSignal(records: OperationalMemoryRecord[], adverseFactPatterns: RegExp[]): number {
  if (!records.length) return 0;
  // Base score from confidence/completion gaps
  const metaScore = avg(records.map((r) => (100 - r.confidenceScore) * 0.5 + (100 - r.completionScore) * 0.3 + r.missingFields.length * 5));
  // Boost score when records contain adverse operational signals (extracted facts)
  const adverseFactHits = records.flatMap((r) => r.extractedFacts).filter((fact) =>
    adverseFactPatterns.some((pattern) => pattern.test(fact)),
  ).length;
  return clamp(metaScore + adverseFactHits * 8);
}

function correlateSignals(records: OperationalMemoryRecord[]): OperationalSignal[] {
  const stakeholder = records.filter((r) => r.domain === "stakeholder_intelligence");
  const delivery = records.filter((r) => r.domain === "delivery_intelligence");
  const team = records.filter((r) => r.domain === "team_health");
  const gov = records.filter((r) => r.domain === "pmo_governance");

  // Stakeholder pressure: elevated when escalation, opposition, or friction facts present
  const stakeholderPressure = scoreDomainSignal(stakeholder, [
    /escalation_behavior:\s*(escalating|threatening)/i,
    /support_level:\s*(concerned|opposed)/i,
    /political_risk:\s*(high|critical)/i,
    /known_frictions:/i,
  ]);

  // Delivery risk: elevated when blockers, at-risk confidence, or critical path facts
  const deliveryRisk = scoreDomainSignal(delivery, [
    /delivery_confidence:\s*(at_risk|critical)/i,
    /blockers:/i,
    /critical_path_risks:/i,
    /current_status:\s*(blocked)/i,
  ]);

  // PM fatigue: elevated when overload, after-hours, or fatigue facts present
  const pmFatigue = scoreDomainSignal(team, [
    /workload_level:\s*(high|critical)/i,
    /after_hours_activity:\s*detected/i,
    /fatigue_risk:\s*(medium|high)/i,
    /overload_signals:/i,
  ]);

  // Governance failure: elevated when missing critical governance artifacts
  const governanceFailure = scoreDomainSignal(gov, [
    /escalation_rules:/i,
    /approval_rules:/i,
  ]);
  // Invert: high governance score = low failure; absence of governance facts = high failure
  const governanceFailureAdjusted = gov.length === 0 ? 60 : clamp(100 - avg(gov.map((r) => r.completionScore)) + governanceFailure * 0.3);

  const signals: OperationalSignal[] = [
    { id: "stakeholder-pressure", signalType: "stakeholder_pressure", score: stakeholderPressure, domain: "stakeholder_intelligence", confidence: stakeholder.length ? 80 : 40 },
    { id: "delivery-risk", signalType: "delivery_risk", score: deliveryRisk, domain: "delivery_intelligence", confidence: delivery.length ? 84 : 40 },
    { id: "pm-fatigue", signalType: "pm_fatigue", score: pmFatigue, domain: "team_health", confidence: team.length ? 74 : 40 },
    { id: "governance-failure", signalType: "governance_failure", score: governanceFailureAdjusted, domain: "pmo_governance", confidence: gov.length ? 88 : 50 },
  ];

  return signals.filter((s) => s.score > 0);
}

function buildInsights(signals: OperationalSignal[], escalation: EscalationRisk, records: OperationalMemoryRecord[]): ExecutiveInsight[] {
  const insights: ExecutiveInsight[] = [];
  const byType = new Map(signals.map((signal) => [signal.signalType, signal] as const));
  const stakeholder = byType.get("stakeholder_pressure");
  const delivery = byType.get("delivery_risk");
  const governance = byType.get("governance_failure");
  const fatigue = byType.get("pm_fatigue");

  // Pull real extracted facts for grounded summaries
  const stakeholderFacts = records.filter((r) => r.domain === "stakeholder_intelligence").flatMap((r) => r.extractedFacts);
  const deliveryFacts = records.filter((r) => r.domain === "delivery_intelligence").flatMap((r) => r.extractedFacts);
  const escalationFact = stakeholderFacts.find((f) => f.startsWith("escalation_behavior:") || f.startsWith("support_level:"));
  const blockerFact = deliveryFacts.find((f) => f.startsWith("blockers:") || f.startsWith("delivery_confidence:"));

  if (stakeholder && delivery && governance && stakeholder.score >= 55 && delivery.score >= 55 && governance.score >= 50) {
    const factAppend = [escalationFact, blockerFact].filter(Boolean).slice(0, 1).map((f) => ` Key signal: ${f}`).join("");
    insights.push({
      id: "cross-domain-escalation-cluster",
      title: "Cross-domain escalation cluster detected",
      summary: `Stakeholder pressure (${stakeholder.score}/100), delivery risk (${delivery.score}/100), and governance gap (${governance.score}/100) breached thresholds simultaneously.${factAppend}`,
      relatedDomains: ["stakeholder_intelligence", "delivery_intelligence", "pmo_governance"],
      confidence: clamp((stakeholder.score + delivery.score + governance.score) / 3),
    });
  }

  if (fatigue && stakeholder && fatigue.score >= 55 && stakeholder.score >= 55) {
    insights.push({
      id: "pm-overload-risk",
      title: "PM overload risk",
      summary: `PM fatigue signal (${fatigue.score}/100) coincides with elevated stakeholder pressure (${stakeholder.score}/100) — coordination burden is increasing and unsustainable at current load.`,
      relatedDomains: ["team_health", "stakeholder_intelligence"],
      confidence: clamp((fatigue.score + stakeholder.score) / 2),
    });
  }

  if (delivery && delivery.score >= 65 && !insights.some((i) => i.id === "cross-domain-escalation-cluster")) {
    const blockerDetail = blockerFact ? ` ${blockerFact}.` : "";
    insights.push({
      id: "delivery-risk-elevated",
      title: "Delivery risk elevated",
      summary: `Delivery risk reached ${delivery.score}/100.${blockerDetail} Unresolved blockers or missing milestones are degrading confidence.`,
      relatedDomains: ["delivery_intelligence", "risk_intelligence"],
      confidence: clamp(delivery.score),
    });
  }

  if (!insights.length) {
    const domainCount = new Set(records.map((r) => r.domain)).size;
    insights.push({
      id: "stable-state",
      title: "Operational state within normal thresholds",
      summary: `No multi-domain escalation pattern detected across ${domainCount} domain${domainCount !== 1 ? "s" : ""} monitored.`,
      relatedDomains: ["operational_memory"],
      confidence: 72,
    });
  }

  if (escalation.level === "critical") {
    insights.push({
      id: "critical-escalation",
      title: "Escalation probability crossed critical threshold",
      summary: `Escalation probability at ${escalation.probabilityScore}% — triggered by: ${escalation.triggers.join("; ") || "cross-domain degradation"}.`,
      relatedDomains: ["executive_context", "risk_intelligence", "delivery_intelligence"],
      confidence: Math.max(82, escalation.probabilityScore),
    });
  }

  return insights;
}

export async function buildExecutiveSynthesis(companyId: string, projectId: string | null): Promise<ExecutiveSynthesisSnapshot> {
  const records = await listOperationalMemory(companyId, projectId);
  const health = computeProjectHealth(records);
  const coherence = computeOperationalCoherence(records);
  const signals = correlateSignals(records);

  const stakeholderPressure = signals.find((s) => s.signalType === "stakeholder_pressure")?.score ?? 0;
  const deliveryRisk = signals.find((s) => s.signalType === "delivery_risk")?.score ?? 0;
  const pmFatigue = signals.find((s) => s.signalType === "pm_fatigue")?.score ?? 0;
  const governanceFailure = signals.find((s) => s.signalType === "governance_failure")?.score ?? 0;

  const hasGovernanceGap = governanceFailure >= 55;
  const level = computeEscalationLevel({ health, coherence, hasGovernanceGap, stakeholderPressure, deliveryRisk });
  const probabilityScore = clamp((100 - health.overall) * 0.45 + (100 - coherence.overall) * 0.2 + stakeholderPressure * 0.2 + deliveryRisk * 0.15);
  const escalationRisk: EscalationRisk = {
    level,
    probabilityScore,
    triggers: [
      stakeholderPressure >= 55 ? "stakeholder pressure rising" : "",
      deliveryRisk >= 55 ? "delivery confidence declining" : "",
      hasGovernanceGap ? "missing governance artifacts" : "",
    ].filter(Boolean),
  };

  const interventions = buildExecutiveInterventions({ escalationLevel: level, stakeholderPressure, deliveryRisk, pmFatigue, governanceGap: hasGovernanceGap });
  const timeline = generateExecutiveTimeline(records);
  const trends = calculateOperationalTrends(records);
  const insights = buildInsights(signals, escalationRisk, records);

  const weakestDomains = OPERATIONAL_DOMAINS.map((domain) => {
    const domainRecords = records.filter((record) => record.domain === domain);
    const score = domainRecords.length ? avg(domainRecords.map((record) => (record.completionScore + record.confidenceScore) / 2)) : 0;
    return { domain, score: clamp(score) };
  }).sort((a, b) => a.score - b.score).slice(0, 3);

  const missingInformationWarnings = OPERATIONAL_DOMAINS.flatMap((domain) => {
    const found = records.filter((record) => record.domain === domain);
    if (!found.length) return [`Missing domain coverage: ${domain}`];
    if (avg(found.map((record) => record.completionScore)) < 45) return [`Low completion in ${domain}`];
    return [];
  });

  return {
    generatedAt: new Date().toISOString(),
    recordsProcessed: records.length,
    health,
    coherence,
    escalationRisk,
    signals,
    insights,
    interventions,
    timeline,
    trends,
    weakestDomains,
    missingInformationWarnings,
  };
}
