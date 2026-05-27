import type { DashboardCardStatus, ExecutiveSummaryCardDTO } from './types'

function resolveStatusFromScore(score: number): DashboardCardStatus {
  if (score >= 80) return 'healthy'
  if (score >= 65) return 'attention'
  return 'critical'
}

export function adaptExecutiveSummaryCard(executiveDashboardReport: any): ExecutiveSummaryCardDTO {
  const score: number = executiveDashboardReport?.healthSummary?.portfolioHealthScore ?? 0

  return {
    title: 'Portfolio Executive Summary',
    summary: executiveDashboardReport?.executiveSummary ?? '',
    status: resolveStatusFromScore(score),
    recommendation: executiveDashboardReport?.portfolioRecommendation ?? '',
  }
}
