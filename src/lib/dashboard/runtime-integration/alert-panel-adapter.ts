import type { AlertPanelItemDTO } from './types'

const MAX_ALERTS = 12

export function adaptAlertPanel(
  executiveDashboardReport: any,
  interventionReport?: unknown,
  decisionSimulationReports?: unknown[],
  conflictReport?: unknown,
): AlertPanelItemDTO[] {
  const alerts: AlertPanelItemDTO[] = []

  // A) Critical conflicts
  const conflicts: unknown[] = conflictReport?.conflicts ?? []
  for (const conflict of conflicts) {
    if (conflict.severity === 'critical') {
      alerts.push({
        id: `conflict-${conflict.id}`,
        title: `Critical Conflict: ${conflict.type ?? 'Unknown'}`,
        type: 'conflict',
        severity: 'critical',
        description:
          conflict.description ??
          conflict.executiveRecommendation ??
          'Critical portfolio conflict detected',
      })
    }
  }

  // B) Critical interventions
  const interventions: unknown[] = interventionReport?.interventions ?? []
  for (const intervention of interventions) {
    if (intervention.urgency === 'critical') {
      alerts.push({
        id: `intervention-${intervention.id}`,
        title: `Critical Intervention: ${intervention.title ?? ''}`,
        type: 'intervention',
        severity: 'critical',
        description: intervention.rationale ?? 'Critical PMO intervention required',
      })
    }
  }

  // C) Escalated or rejected decision simulations
  const decisions: unknown[] = decisionSimulationReports ?? []
  for (const decision of decisions) {
    if (decision.recommendation === 'escalate' || decision.recommendation === 'reject') {
      alerts.push({
        id: `decision-${decision.decisionId}`,
        title: `Decision Escalation: ${decision.executiveSummary ?? decision.decisionType ?? ''}`,
        type: 'decision',
        severity: 'critical',
        description: decision.recommendationRationale ?? 'Decision requires executive escalation',
      })
    }
  }

  // D) Portfolio health critical state
  const healthScore: number = executiveDashboardReport?.healthSummary?.portfolioHealthScore ?? 100
  if (healthScore < 65) {
    alerts.push({
      id: 'portfolio-health-critical',
      title: 'Portfolio Health Critical',
      type: 'health',
      severity: 'critical',
      description:
        executiveDashboardReport?.healthSummary?.summary ??
        'Portfolio health has reached critical threshold',
    })
  }

  return alerts.slice(0, MAX_ALERTS)
}
