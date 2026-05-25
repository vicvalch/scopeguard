import type { DashboardConsumptionInput, DashboardFetchOptions, DashboardViewModel } from './types.ts'
import { deriveDashboardConsumptionStatus } from './dashboard-state-machine.ts'
import { adaptDashboardViewModel } from './dashboard-view-model-adapter.ts'
import { fetchPortfolioDashboard } from './dashboard-fetcher.ts'

export function runDashboardConsumptionRuntime(input: DashboardConsumptionInput): DashboardViewModel {
  const derivedStatus = deriveDashboardConsumptionStatus(input)
  const viewModel = adaptDashboardViewModel(input)
  return { ...viewModel, status: derivedStatus }
}

export async function loadPortfolioDashboardViewModel(
  options: DashboardFetchOptions = {},
): Promise<DashboardViewModel> {
  try {
    const apiResponse = await fetchPortfolioDashboard(options)
    return runDashboardConsumptionRuntime({ apiResponse })
  } catch (fetchError: any) {
    const normalizedError =
      fetchError && typeof fetchError.code === 'string'
        ? fetchError
        : {
            code: 'dashboard_api_network_error',
            message: fetchError instanceof Error ? fetchError.message : 'Unknown fetch error',
            recoverable: true,
          }
    return runDashboardConsumptionRuntime({ fetchError: normalizedError })
  }
}
