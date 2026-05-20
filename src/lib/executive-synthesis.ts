import { listOperationalMemory, OPERATIONAL_DOMAINS, type OperationalDomain, type OperationalMemoryRecord } from "@/lib/operational-memory";
import { buildExecutiveInterventions, type ExecutiveInterventionRecommendation } from "@/lib/intervention-engine";
import { calculateOperationalTrends, generateExecutiveTimeline, type ExecutiveTimelineEvent, type OperationalTrend } from "@/lib/executive-timeline";
import { computeEscalationLevel, computeOperationalCoherence, computeProjectHealth, type EscalationLevel, type OperationalCoherenceScore, type ProjectHealthScore } from "@/lib/executive-health";
import {
  detectHiddenRiskAccumulation,
  assessDependencyPropagation,
  computeCompoundSeverityBoost,
  detectOperationalContradictions,
  type OperationalContradiction,
  type HiddenRiskPattern,
} from "@/lib/cross-signal-reasoning";

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
  contradictions: OperationalContradiction[];
  hiddenRiskPattern: HiddenRiskPattern | null;
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

  // Only emit a signal if there are actual records to back it — no phantom signals from empty domains
  return signals.filter((s) => s.score > 0 && s.confidence >= 50);
}

function buildInsights(
  signals: OperationalSignal[],
  escalation: EscalationRisk,
  records: OperationalMemoryRecord[],
  contradictions: OperationalContradiction[],
  hiddenRisk: HiddenRiskPattern | null,
): ExecutiveInsight[] {
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
  const dependencyFact = deliveryFacts.find((f) => f.startsWith("dependencies:"));

  // Averaged confidence across active signals for use in fallback insight
  const avgSignalConf = signals.length ? clamp(avg(signals.map((s) => s.confidence))) : 50;

  // 1. Cross-domain escalation chain: compounding multi-domain deterioration
  if (stakeholder && delivery && governance && stakeholder.score >= 55 && delivery.score >= 55 && governance.score >= 50) {
    const factAppend = [escalationFact, blockerFact].filter(Boolean).slice(0, 1).map((f) => ` Key signal: ${f}`).join("");
    const causalDetail =
      stakeholder.score >= 65 && delivery.score >= 65
        ? ` Stakeholder pressure is amplifying delivery risk, which is further widening the governance gap.`
        : ` These signals reinforce each other — resolution of any one domain is insufficient without addressing all three.`;
    insights.push({
      id: "cross-domain-escalation-cluster",
      title: "Cross-domain escalation chain detected",
      summary: `Stakeholder pressure (${stakeholder.score}/100), delivery risk (${delivery.score}/100), and governance gap (${governance.score}/100) have breached thresholds simultaneously.${causalDetail}${factAppend}`,
      relatedDomains: ["stakeholder_intelligence", "delivery_intelligence", "pmo_governance"],
      confidence: clamp((stakeholder.score + delivery.score + governance.score) / 3),
    });
  }

  // 2. PM overload: fatigue and pressure co-degrading
  if (fatigue && stakeholder && fatigue.score >= 55 && stakeholder.score >= 55) {
    const amplifyDetail =
      delivery && delivery.score >= 50
        ? ` This is amplifying delivery risk (${delivery.score}/100) because PM bandwidth is the coordination bottleneck.`
        : "";
    insights.push({
      id: "pm-overload-risk",
      title: "PM overload risk — coordination bottleneck forming",
      summary: `PM fatigue (${fatigue.score}/100) is co-occurring with elevated stakeholder pressure (${stakeholder.score}/100) — coordination burden is increasing beyond sustainable capacity.${amplifyDetail}`,
      relatedDomains: ["team_health", "stakeholder_intelligence"],
      confidence: clamp((fatigue.score + stakeholder.score) / 2),
    });
  }

  // 3. Delivery risk elevated (single-domain, not already captured by chain insight)
  if (delivery && delivery.score >= 65 && !insights.some((i) => i.id === "cross-domain-escalation-cluster")) {
    const blockerDetail = blockerFact ? ` ${blockerFact}.` : "";
    const propagationNote =
      stakeholder && stakeholder.score >= 40
        ? ` This is causing downstream stakeholder pressure (${stakeholder.score}/100) — delivery degradation is not yet isolated.`
        : "";
    insights.push({
      id: "delivery-risk-elevated",
      title: "Delivery risk elevated",
      summary: `Delivery risk reached ${delivery.score}/100.${blockerDetail} Unresolved blockers or missing milestones are degrading execution confidence.${propagationNote}`,
      relatedDomains: ["delivery_intelligence", "risk_intelligence"],
      confidence: clamp(delivery.score),
    });
  }

  // 4. Operational contradiction: incoherent cross-domain narrative
  if (contradictions.length >= 1) {
    const worstContradiction = contradictions[0];
    const additionalNote =
      contradictions.length >= 2 ? ` ${contradictions.length - 1} additional contradiction${contradictions.length - 1 !== 1 ? "s" : ""} detected.` : "";
    insights.push({
      id: "operational-contradiction",
      title: "Operational narrative contradiction detected",
      summary: `${worstContradiction.description}${additionalNote} Cross-domain signals are inconsistent — executive conclusions should be treated with increased caution until resolved.`,
      relatedDomains: ["executive_context", "operational_memory"],
      confidence: clamp(60 - contradictions.length * 8),
    });
  }

  // 5. Hidden risk accumulation: weak signals compounding below individual alarm thresholds
  if (hiddenRisk && hiddenRisk.accumulatedScore >= 40) {
    insights.push({
      id: "hidden-risk-accumulation",
      title: "Hidden risk accumulation detected",
      summary: hiddenRisk.description,
      relatedDomains: ["risk_intelligence", "delivery_intelligence", "stakeholder_intelligence"],
      confidence: clamp(hiddenRisk.accumulatedScore),
    });
  }

  // 6. Dependency propagation: unresolved dependencies threatening adjacent domains
  if (dependencyFact && delivery && delivery.score >= 40) {
    const depPropagation = assessDependencyPropagation({
      dependencyCount: deliveryFacts.filter((f) => f.startsWith("dependencies:")).length,
      unresolvedIssues: records.filter((r) => r.domain === "delivery_intelligence").flatMap((r) => r.extractedFacts).filter((f) => /current_status:\s*blocked/i.test(f)).length,
      deliveryRiskScore: delivery.score,
      stakeholderPressureScore: stakeholder?.score ?? 0,
      daysSilent: 0,
    });
    if (depPropagation.propagationRisk !== "none") {
      insights.push({
        id: "dependency-propagation-risk",
        title: "Dependency chain threatening adjacent domains",
        summary: depPropagation.description,
        relatedDomains: ["delivery_intelligence", "risk_intelligence"],
        confidence: clamp(delivery.score),
      });
    }
  }

  // 7. Stable state fallback — only when nothing else triggers
  if (!insights.length) {
    const domainCount = new Set(records.map((r) => r.domain)).size;
    insights.push({
      id: "stable-state",
      title: "Operational state within normal thresholds",
      summary: `No multi-domain escalation pattern detected across ${domainCount} domain${domainCount !== 1 ? "s" : ""} monitored.`,
      relatedDomains: ["operational_memory"],
      confidence: avgSignalConf,
    });
  }

  // 8. Critical escalation always surfaces when threshold is crossed
  if (escalation.level === "critical") {
    insights.push({
      id: "critical-escalation",
      title: "Escalation probability crossed critical threshold",
      summary: `Escalation probability at ${escalation.probabilityScore}% — triggered by: ${escalation.triggers.join("; ") || "cross-domain degradation"}. This pattern persists because the compounding signals have not been addressed at their root domains.`,
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

  // Cross-signal reasoning: compute compound severity and detect contradictions.
  // These are passed into escalation level so contradictions increase executive caution.
  const contradictions = detectOperationalContradictions(records);
  const compoundSeverityBoost = computeCompoundSeverityBoost({ stakeholderPressure, deliveryRisk, governanceFailure, pmFatigue });
  const hiddenRiskPattern = detectHiddenRiskAccumulation({
    stakeholderPressure,
    deliveryRisk,
    pmFatigue,
    governanceFailure,
    escalationProbability: clamp((100 - health.overall) * 0.45 + (100 - coherence.overall) * 0.2),
  });

  const hasGovernanceGap = governanceFailure >= 55;
  const level = computeEscalationLevel({ health, coherence, hasGovernanceGap, stakeholderPressure, deliveryRisk, compoundSeverityBoost });

  // Probability score accounts for compound signal reinforcement and contradiction-induced uncertainty.
  // Contradictions don't just penalize coherence — they also reduce confidence in any "green" readings.
  const baseProbability = clamp((100 - health.overall) * 0.45 + (100 - coherence.overall) * 0.2 + stakeholderPressure * 0.2 + deliveryRisk * 0.15);
  const probabilityScore = clamp(baseProbability + compoundSeverityBoost);

  const escalationRisk: EscalationRisk = {
    level,
    probabilityScore,
    triggers: [
      stakeholderPressure >= 55 ? "stakeholder pressure rising" : "",
      deliveryRisk >= 55 ? "delivery confidence declining" : "",
      hasGovernanceGap ? "missing governance artifacts" : "",
      contradictions.length >= 1 ? "operational narrative contradictions reducing confidence" : "",
      compoundSeverityBoost >= 10 ? "compound multi-signal deterioration detected" : "",
      hiddenRiskPattern ? "hidden risk accumulation pattern active" : "",
    ].filter(Boolean),
  };

  const interventions = buildExecutiveInterventions({ escalationLevel: level, stakeholderPressure, deliveryRisk, pmFatigue, governanceGap: hasGovernanceGap });
  const timeline = generateExecutiveTimeline(records);
  const trends = calculateOperationalTrends(records);
  const insights = buildInsights(signals, escalationRisk, records, contradictions, hiddenRiskPattern);

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
    contradictions,
    hiddenRiskPattern,
  };
}
