import { adaptPortfolioHealthPanel } from './portfolio-health-adapter.ts'
import { adaptExecutiveSummaryCard } from './executive-summary-adapter.ts'
import { adaptRiskTable } from './risk-table-adapter.ts'
import { adaptDecisionWidget } from './decision-widget-adapter.ts'
import { adaptInterventionQueue } from './intervention-queue-adapter.ts'
import { adaptAlertPanel } from './alert-panel-adapter.ts'
import type { DashboardRuntimeInput, PortfolioExecutiveDashboardDTO } from './types.ts'

export function buildPortfolioExecutiveDashboardDTO(
  input: DashboardRuntimeInput,
): PortfolioExecutiveDashboardDTO {
  const { executiveDashboardReport, interventionReport, decisionSimulationReports, conflictReport } =
    input

  return {
    portfolioHealthPanel: adaptPortfolioHealthPanel(executiveDashboardReport),
    executiveSummaryCard: adaptExecutiveSummaryCard(executiveDashboardReport),
    topRisksTable: adaptRiskTable(executiveDashboardReport),
    decisionsWidget: adaptDecisionWidget(decisionSimulationReports ?? []),
    interventionsQueue: adaptInterventionQueue(interventionReport),
    alertPanel: adaptAlertPanel(
      executiveDashboardReport,
      interventionReport,
      decisionSimulationReports,
      conflictReport,
    ),
  }
}
