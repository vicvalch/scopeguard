import { buildExecutionRiskSnapshot } from "@/lib/execution-risk";
import type { ProjectMemorySnapshot } from "@/lib/memory/organization-memory";
import { buildStakeholderRelationshipSnapshot } from "@/lib/stakeholder-intelligence";

export type InterventionSeverity = "none" | "watch" | "elevated" | "critical";
export type InterventionCategory = "delivery_recovery" | "stakeholder_alignment" | "execution_unblock" | "capacity_protection" | "escalation_governance";
export type EscalationTarget = "none" | "project_lead" | "delivery_manager" | "sponsor" | "executive_steering_committee" | "portfolio_office";

export type InterventionTrigger = {
  key:
    | "unresolved_blockers_increasing"
    | "no_recent_execution_updates"
    | "pressure_confidence_divergence"
    | "repeated_escalation_without_resolution"
    | "execution_instability_multi_signal"
    | "unstable_delivery_cadence"
    | "pm_overload_signal"
    | "organizational_silence_after_escalation";
  active: boolean;
  score: number;
  reason: string;
};

export type DeliveryInstabilitySignal = {
  severity: InterventionSeverity;
  instabilityScore: number;
  unstableCadence: boolean;
  executionInstabilityAcrossSignals: boolean;
  unresolvedBlockersIncreasing: boolean;
  noRecentExecutionUpdates: boolean;
};

export type OperationalDriftSignal = {
  severity: InterventionSeverity;
  driftScore: number;
  organizationalDrift: boolean;
  repeatedEscalationWithoutResolution: boolean;
  organizationalSilenceAfterEscalation: boolean;
  pressureConfidenceDivergence: boolean;
};

export type InterventionRecommendation = {
  category: InterventionCategory;
  severity: InterventionSeverity;
  triggerKeys: InterventionTrigger["key"][];
  action: string;
  rationale: string;
};

export type EscalationRecommendation = {
  severity: InterventionSeverity;
  target: EscalationTarget;
  reason: string;
  requiredWithinHours: number;
};

export type InterventionSnapshot = {
  projectId: string | null;
  generatedAt: string;
  interventionRequired: boolean;
  interventionUrgency: InterventionSeverity;
  escalationProbability: number;
  deliveryBreakdownRisk: number;
  organizationalDrift: number;
  recommendedInterventionType: InterventionCategory;
  escalationTarget: EscalationTarget;
  machineOutput: {
    intervention_required: boolean;
    escalation_probability: number;
    delivery_breakdown_risk: number;
    organizational_drift: number;
    recommended_intervention_type: InterventionCategory;
    escalation_target: EscalationTarget;
  };
  commentary: string[];
  deliveryInstability: DeliveryInstabilitySignal;
  operationalDriftSignal: OperationalDriftSignal;
  stakeholderBreakdown: boolean;
  executionDeadlock: boolean;
  triggers: InterventionTrigger[];
  interventions: InterventionRecommendation[];
  escalations: EscalationRecommendation[];
};

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const toSeverity = (score: number): InterventionSeverity => (score >= 85 ? "critical" : score >= 65 ? "elevated" : score >= 40 ? "watch" : "none");

const daysSince = (dateValue: string | null): number => {
  if (!dateValue) return 14;
  const parsed = Date.parse(dateValue);
  if (Number.isNaN(parsed)) return 14;
  return Math.max(0, Math.floor((Date.now() - parsed) / 86_400_000));
};

export function detectDeliveryInstability(snapshot: ProjectMemorySnapshot | null): DeliveryInstabilitySignal {
  const blockers = snapshot?.project.blockers.length ?? 0;
  const unresolved = snapshot?.project.unresolvedIssues.length ?? 0;
  const commitments = snapshot?.project.commitments.length ?? 0;
  const risks = snapshot?.project.risks.length ?? 0;
  const daysSilent = daysSince(snapshot?.lastUpdatedAt ?? null);

  const unresolvedBlockersIncreasing = blockers + unresolved >= 5;
  const noRecentExecutionUpdates = daysSilent >= 7;
  const unstableCadence = commitments >= 4 && (blockers > 0 || unresolved > 0);
  const executionInstabilityAcrossSignals = risks >= 3 && unresolved >= 2;

  const instabilityScore = clamp(
    (unresolvedBlockersIncreasing ? 28 : 0) +
      (noRecentExecutionUpdates ? 24 : 0) +
      (unstableCadence ? 24 : 0) +
      (executionInstabilityAcrossSignals ? 24 : 0),
  );

  return {
    severity: toSeverity(instabilityScore),
    instabilityScore,
    unstableCadence,
    executionInstabilityAcrossSignals,
    unresolvedBlockersIncreasing,
    noRecentExecutionUpdates,
  };
}

export function detectOperationalDrift(snapshot: ProjectMemorySnapshot | null): OperationalDriftSignal {
  const stakeholderPressureEvents = snapshot?.stakeholders.reduce((sum, s) => sum + s.pressurePatterns.length, 0) ?? 0;
  const concerns = snapshot?.detectedConcerns.length ?? 0;
  const unresolvedDecisions = snapshot?.decisions.filter((item) => item.unresolvedConsequences.length > 0).length ?? 0;
  const organizationSilence = daysSince(snapshot?.lastUpdatedAt ?? null) >= 10;

  const pressureConfidenceDivergence = stakeholderPressureEvents >= 5 && (snapshot?.project.blockers.length ?? 0) >= 3;
  const repeatedEscalationWithoutResolution = stakeholderPressureEvents >= 7 && unresolvedDecisions >= 2;
  const organizationalSilenceAfterEscalation = organizationSilence && stakeholderPressureEvents >= 3;
  const organizationalDrift = concerns >= 4 || unresolvedDecisions >= 3 || organizationalSilenceAfterEscalation;

  const driftScore = clamp(
    (pressureConfidenceDivergence ? 30 : 0) +
      (repeatedEscalationWithoutResolution ? 30 : 0) +
      (organizationalSilenceAfterEscalation ? 20 : 0) +
      (organizationalDrift ? 20 : 0),
  );

  return {
    severity: toSeverity(driftScore),
    driftScore,
    organizationalDrift,
    repeatedEscalationWithoutResolution,
    organizationalSilenceAfterEscalation,
    pressureConfidenceDivergence,
  };
}

export function detectEscalationNeed(input: { deliveryInstability: DeliveryInstabilitySignal; operationalDriftSignal: OperationalDriftSignal; stakeholderBreakdown: boolean; executionDeadlock: boolean }): number {
  return clamp(
    input.deliveryInstability.instabilityScore * 0.35 +
      input.operationalDriftSignal.driftScore * 0.35 +
      (input.stakeholderBreakdown ? 18 : 0) +
      (input.executionDeadlock ? 12 : 0),
  );
}

export function detectStakeholderBreakdown(snapshot: ProjectMemorySnapshot | null): boolean {
  const highPressureStakeholders = snapshot?.stakeholders.filter((s) => s.influence === "high" && s.pressurePatterns.length >= 2).length ?? 0;
  const decisionDriversInConflict = snapshot?.stakeholders.filter((s) => (s.decisionAuthority === "driver" || s.decisionAuthority === "approver") && s.sentimentSignals.length >= 3).length ?? 0;
  return highPressureStakeholders >= 2 || decisionDriversInConflict >= 2;
}

export function detectExecutionDeadlock(snapshot: ProjectMemorySnapshot | null): boolean {
  const blockers = snapshot?.project.blockers.length ?? 0;
  const unresolvedIssues = snapshot?.project.unresolvedIssues.length ?? 0;
  const unresolvedDecisions = snapshot?.decisions.filter((decision) => decision.unresolvedConsequences.length > 0).length ?? 0;
  return blockers >= 3 && unresolvedIssues >= 3 && unresolvedDecisions >= 1;
}

export function generateInterventionRecommendations(triggers: InterventionTrigger[]): InterventionRecommendation[] {
  const active = new Set(triggers.filter((item) => item.active).map((item) => item.key));
  const recommendations: InterventionRecommendation[] = [];

  if (active.has("unresolved_blockers_increasing") || active.has("unstable_delivery_cadence")) {
    recommendations.push({ category: "execution_unblock", severity: "elevated", triggerKeys: ["unresolved_blockers_increasing", "unstable_delivery_cadence"].filter((key) => active.has(key as InterventionTrigger["key"])) as InterventionTrigger["key"][], action: "Run a blocker-burn session with owners and dates for top unresolved execution constraints.", rationale: "Execution stability deteriorating without corrective intervention." });
  }
  if (active.has("pressure_confidence_divergence") || active.has("repeated_escalation_without_resolution")) {
    recommendations.push({ category: "stakeholder_alignment", severity: "critical", triggerKeys: ["pressure_confidence_divergence", "repeated_escalation_without_resolution"].filter((key) => active.has(key as InterventionTrigger["key"])) as InterventionTrigger["key"][], action: "Reset stakeholder contract: clarify tradeoffs, decision owners, and confidence gates in one alignment checkpoint.", rationale: "Stakeholder escalation pressure now exceeds delivery confidence." });
  }
  if (active.has("no_recent_execution_updates") || active.has("organizational_silence_after_escalation")) {
    recommendations.push({ category: "delivery_recovery", severity: "elevated", triggerKeys: ["no_recent_execution_updates", "organizational_silence_after_escalation"].filter((key) => active.has(key as InterventionTrigger["key"])) as InterventionTrigger["key"][], action: "Re-establish operating cadence with a deterministic update window and explicit owner accountability.", rationale: "Project drift detected across operational checkpoints." });
  }

  if (recommendations.length === 0) {
    recommendations.push({ category: "capacity_protection", severity: "watch", triggerKeys: [], action: "Maintain current execution cadence and monitor intervention thresholds daily.", rationale: "No immediate intervention pattern has crossed escalation thresholds." });
  }

  return recommendations;
}

export function generateEscalationRecommendations(input: { escalationProbability: number; stakeholderBreakdown: boolean; executionDeadlock: boolean; operationalDriftSignal: OperationalDriftSignal }): EscalationRecommendation[] {
  if (input.escalationProbability < 40) {
    return [{ severity: "none", target: "none", reason: "Escalation pathways are not required under current deterministic thresholds.", requiredWithinHours: 0 }];
  }

  const baseTarget: EscalationTarget = input.executionDeadlock
    ? "delivery_manager"
    : input.stakeholderBreakdown
      ? "sponsor"
      : input.operationalDriftSignal.repeatedEscalationWithoutResolution
        ? "executive_steering_committee"
        : "project_lead";

  const severity = toSeverity(input.escalationProbability);
  const requiredWithinHours = severity === "critical" ? 6 : severity === "elevated" ? 24 : 72;

  return [{
    severity,
    target: input.operationalDriftSignal.organizationalSilenceAfterEscalation && severity === "critical" ? "portfolio_office" : baseTarget,
    reason: "Repeated escalation patterns indicate unresolved organizational friction.",
    requiredWithinHours,
  }];
}

// Architectural runway: deterministic intervention snapshots intentionally preserve typed machine rails
// for autonomous escalation agents, AI-driven intervention orchestration, PM coaching systems,
// portfolio-wide intervention prioritization, organizational execution graphs, and AI execution governance.
export function buildInterventionSnapshot(projectId: string | null, snapshot: ProjectMemorySnapshot | null): InterventionSnapshot {
  const executionRisk = buildExecutionRiskSnapshot(projectId, snapshot);
  const stakeholderIntel = buildStakeholderRelationshipSnapshot(projectId, snapshot);
  const deliveryInstability = detectDeliveryInstability(snapshot);
  const operationalDriftSignal = detectOperationalDrift(snapshot);
  const stakeholderBreakdown = detectStakeholderBreakdown(snapshot);
  const executionDeadlock = detectExecutionDeadlock(snapshot);

  const triggers: InterventionTrigger[] = [
    { key: "unresolved_blockers_increasing", active: deliveryInstability.unresolvedBlockersIncreasing, score: deliveryInstability.unresolvedBlockersIncreasing ? 75 : 15, reason: "Unresolved blockers and execution issues continue to accumulate." },
    { key: "no_recent_execution_updates", active: deliveryInstability.noRecentExecutionUpdates, score: deliveryInstability.noRecentExecutionUpdates ? 70 : 10, reason: "No project updates within the current execution window." },
    { key: "pressure_confidence_divergence", active: operationalDriftSignal.pressureConfidenceDivergence, score: operationalDriftSignal.pressureConfidenceDivergence ? 82 : 20, reason: "Stakeholder pressure is rising while delivery confidence drops." },
    { key: "repeated_escalation_without_resolution", active: operationalDriftSignal.repeatedEscalationWithoutResolution, score: operationalDriftSignal.repeatedEscalationWithoutResolution ? 88 : 18, reason: "Escalation loops are present without organizational resolution." },
    { key: "execution_instability_multi_signal", active: deliveryInstability.executionInstabilityAcrossSignals, score: deliveryInstability.executionInstabilityAcrossSignals ? 74 : 16, reason: "Multiple deterministic execution signals are unstable." },
    { key: "unstable_delivery_cadence", active: deliveryInstability.unstableCadence, score: deliveryInstability.unstableCadence ? 68 : 12, reason: "Delivery cadence is unstable relative to active commitments." },
    { key: "pm_overload_signal", active: (snapshot?.project.commitments.length ?? 0) >= 6 && (snapshot?.project.blockers.length ?? 0) >= 3, score: (snapshot?.project.commitments.length ?? 0) >= 6 ? 72 : 22, reason: "PM overload signal detected from sustained commitments and blockers." },
    { key: "organizational_silence_after_escalation", active: operationalDriftSignal.organizationalSilenceAfterEscalation, score: operationalDriftSignal.organizationalSilenceAfterEscalation ? 84 : 14, reason: "Organizational silence followed after escalation pressure increased." },
  ];

  const escalationProbability = detectEscalationNeed({ deliveryInstability, operationalDriftSignal, stakeholderBreakdown, executionDeadlock });
  const interventionUrgency = toSeverity(clamp((deliveryInstability.instabilityScore + operationalDriftSignal.driftScore + escalationProbability) / 3));
  const interventions = generateInterventionRecommendations(triggers);
  const escalations = generateEscalationRecommendations({ escalationProbability, stakeholderBreakdown, executionDeadlock, operationalDriftSignal });

  const interventionRequired = interventionUrgency === "elevated" || interventionUrgency === "critical";
  const recommendedInterventionType = interventions[0]?.category ?? "capacity_protection";
  const escalationTarget = escalations[0]?.target ?? "none";

  return {
    projectId,
    generatedAt: new Date().toISOString(),
    interventionRequired,
    interventionUrgency,
    escalationProbability,
    deliveryBreakdownRisk: clamp((deliveryInstability.instabilityScore * 0.6) + (executionRisk.overallRisk === "critical" ? 35 : executionRisk.overallRisk === "high" ? 20 : executionRisk.overallRisk === "medium" ? 10 : 0)),
    organizationalDrift: clamp((operationalDriftSignal.driftScore * 0.7) + (stakeholderIntel.politicalRisk === "critical" ? 30 : stakeholderIntel.politicalRisk === "high" ? 20 : stakeholderIntel.politicalRisk === "moderate" ? 10 : 0)),
    recommendedInterventionType,
    escalationTarget,
    machineOutput: {
      intervention_required: interventionRequired,
      escalation_probability: escalationProbability,
      delivery_breakdown_risk: clamp((deliveryInstability.instabilityScore * 0.6) + (executionRisk.overallRisk === "critical" ? 35 : executionRisk.overallRisk === "high" ? 20 : executionRisk.overallRisk === "medium" ? 10 : 0)),
      organizational_drift: clamp((operationalDriftSignal.driftScore * 0.7) + (stakeholderIntel.politicalRisk === "critical" ? 30 : stakeholderIntel.politicalRisk === "high" ? 20 : stakeholderIntel.politicalRisk === "moderate" ? 10 : 0)),
      recommended_intervention_type: recommendedInterventionType,
      escalation_target: escalationTarget,
    },
    commentary: [
      "Execution stability deteriorating without corrective intervention.",
      "Stakeholder escalation pressure now exceeds delivery confidence.",
      "Project drift detected across operational checkpoints.",
      "Repeated escalation patterns indicate unresolved organizational friction.",
      "Intervention recommended before executive escalation occurs.",
    ],
    deliveryInstability,
    operationalDriftSignal,
    stakeholderBreakdown,
    executionDeadlock,
    triggers,
    interventions,
    escalations,
  };
}
