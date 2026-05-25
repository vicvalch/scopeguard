import { adaptPortfolioHealthPanel } from './portfolio-health-adapter.ts'
import { adaptExecutiveSummaryCard } from './executive-summary-adapter.ts'
import { adaptRiskTable } from './risk-table-adapter.ts'
import { adaptDecisionWidget } from './decision-widget-adapter.ts'
import { adaptInterventionQueue } from './intervention-queue-adapter.ts'
import { adaptAlertPanel } from './alert-panel-adapter.ts'
import type { DashboardRuntimeInput, PortfolioExecutiveDashboardDTO } from './types.ts'

export function runDashboardRuntimeIntegration(
  input: DashboardRuntimeInput,
): PortfolioExecutiveDashboardDTO {
  const { executiveDashboardReport, interventionReport, decisionSimulationReports, conflictReport } =
    input

  const portfolioHealthPanel = adaptPortfolioHealthPanel(executiveDashboardReport)
  const executiveSummaryCard = adaptExecutiveSummaryCard(executiveDashboardReport)
  const topRisksTable = adaptRiskTable(executiveDashboardReport)
  const decisionsWidget = adaptDecisionWidget(decisionSimulationReports ?? [])
  const interventionsQueue = adaptInterventionQueue(interventionReport)
  const alertPanel = adaptAlertPanel(
    executiveDashboardReport,
    interventionReport,
    decisionSimulationReports,
    conflictReport,
  )

  return {
    portfolioHealthPanel,
    executiveSummaryCard,
    topRisksTable,
    decisionsWidget,
    interventionsQueue,
    alertPanel,
  }
}
