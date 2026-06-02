import type { DashboardSeverity, DecisionWidgetItemDTO } from './types'

const MAX_DECISION_ITEMS = 8

function resolveDecisionSeverity(recommendation: string, confidenceScore: number): DashboardSeverity {
  if (recommendation === 'reject' || recommendation === 'escalate') return 'critical'
  if (
    confidenceScore >= 80 &&
    (recommendation === 'approve' || recommendation === 'approve_with_conditions')
  ) {
    return 'info'
  }
  return 'warning'
}

export function adaptDecisionWidget(decisionSimulationReports: any[]): DecisionWidgetItemDTO[] {
  if (!decisionSimulationReports?.length) return []

  return decisionSimulationReports.slice(0, MAX_DECISION_ITEMS).map((report: any): DecisionWidgetItemDTO => ({
    id: report.decisionId ?? '',
    title: report.executiveSummary ?? report.decisionType ?? '',
    recommendation: report.recommendation ?? '',
    confidenceScore: report.confidenceScore ?? 0,
    severity: resolveDecisionSeverity(report.recommendation ?? '', report.confidenceScore ?? 0),
  }))
}
