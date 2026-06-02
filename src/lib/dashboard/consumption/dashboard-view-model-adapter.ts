import type {
  DashboardConsumptionInput,
  DashboardConsumptionError,
  DashboardViewModel,
} from './types'

function makeBaseViewModel(): DashboardViewModel {
  return {
    status: 'idle',
    healthScore: 0,
    healthLabel: '',
    executiveSummary: '',
    portfolioRecommendation: '',
    risksCount: 0,
    criticalRisksCount: 0,
    decisionsCount: 0,
    interventionsCount: 0,
    alertsCount: 0,
    hasCriticalAttention: false,
    sections: {
      healthPanel: null,
      executiveSummaryCard: null,
      topRisksTable: [],
      decisionsWidget: [],
      interventionsQueue: [],
      alertPanel: [],
    },
    warnings: [],
  }
}

export function adaptDashboardViewModel(input: DashboardConsumptionInput): DashboardViewModel {
  const base = makeBaseViewModel()

  if (input.loading) {
    return {
      ...base,
      status: 'loading',
      executiveSummary: 'Loading portfolio dashboard...',
    }
  }

  if (input.fetchError) {
    return {
      ...base,
      status: 'error',
      executiveSummary: input.fetchError.message,
      error: input.fetchError,
    }
  }

  const apiResponse = input.apiResponse
  if (!apiResponse) {
    return base
  }

  const data = apiResponse.data ?? {}
  const warnings: string[] = apiResponse.warnings ?? []

  if (apiResponse.status === 'error') {
    const firstWarning = warnings[0] ?? 'Dashboard data unavailable'
    const error: DashboardConsumptionError = {
      code: 'dashboard_api_http_error',
      message: firstWarning,
      recoverable: true,
    }
    return {
      ...base,
      status: 'error',
      executiveSummary: firstWarning,
      warnings,
      error,
    }
  }

  const topRisksTable: unknown[] = data.topRisksTable ?? []
  const decisionsWidget: unknown[] = data.decisionsWidget ?? []
  const interventionsQueue: unknown[] = data.interventionsQueue ?? []
  const alertPanel: unknown[] = data.alertPanel ?? []
  const healthPanel = data.portfolioHealthPanel ?? {}
  const summaryCard = data.executiveSummaryCard ?? {}

  const healthScore: number = healthPanel.score ?? 0
  const healthLabel: string = healthPanel.label ?? ''
  const criticalRisksCount = topRisksTable.filter((r: any) => r.severity === 'critical').length
  const hasCriticalAttention =
    criticalRisksCount > 0 ||
    alertPanel.some((a: any) => a.severity === 'critical') ||
    healthPanel.status === 'critical'

  let status: DashboardViewModel['status']
  switch (apiResponse.status) {
    case 'empty':
      status = 'empty'
      break
    case 'partial':
      status = 'partial'
      break
    case 'ok':
      status = 'ready'
      break
    default:
      status = 'error'
  }

  return {
    status,
    healthScore,
    healthLabel,
    executiveSummary: summaryCard.summary ?? '',
    portfolioRecommendation: summaryCard.recommendation ?? '',
    risksCount: topRisksTable.length,
    criticalRisksCount,
    decisionsCount: decisionsWidget.length,
    interventionsCount: interventionsQueue.length,
    alertsCount: alertPanel.length,
    hasCriticalAttention,
    sections: {
      healthPanel,
      executiveSummaryCard: summaryCard,
      topRisksTable,
      decisionsWidget,
      interventionsQueue,
      alertPanel,
    },
    warnings,
  }
}
