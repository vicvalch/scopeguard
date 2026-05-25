import type { DashboardSeverity, RiskTableRowDTO } from './types.ts'

const MAX_RISK_ROWS = 10

function mapRiskLevelToSeverity(riskLevel: string): DashboardSeverity {
  if (riskLevel === 'critical') return 'critical'
  if (riskLevel === 'high' || riskLevel === 'moderate') return 'warning'
  return 'info'
}

export function adaptRiskTable(executiveDashboardReport: any): RiskTableRowDTO[] {
  const topRisks: any[] = executiveDashboardReport?.topRisks ?? []

  return topRisks.slice(0, MAX_RISK_ROWS).map((risk: any): RiskTableRowDTO => ({
    id: risk.id ?? '',
    title: risk.title ?? '',
    severity: mapRiskLevelToSeverity(risk.riskLevel ?? ''),
    source: risk.source ?? '',
    affectedProjects: risk.affectedProjects ?? [],
    rationale: risk.rationale ?? '',
  }))
}
