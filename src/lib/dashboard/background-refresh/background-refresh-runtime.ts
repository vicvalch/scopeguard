import type {
  DashboardBackgroundRefreshRequest,
  DashboardBackgroundRefreshReport,
} from './types.ts'
import { planDashboardBackgroundRefresh } from './refresh-execution-planner.ts'
import { executeDashboardRefreshActions } from './refresh-executor.ts'
import { buildDashboardBackgroundRefreshReport } from './refresh-result-engine.ts'

export async function runDashboardBackgroundRefresh(
  request: DashboardBackgroundRefreshRequest,
): Promise<DashboardBackgroundRefreshReport> {
  const mode = request.mode ?? 'execute'
  const now = new Date().toISOString()

  if (!request.hydrationRequest.tenantId) {
    return buildDashboardBackgroundRefreshReport({
      trigger: request.trigger,
      mode,
      generatedAt: now,
      executions: [],
      warnings: ['tenantId is required for dashboard background refresh.'],
    })
  }

  const plannerResult = await planDashboardBackgroundRefresh(request)

  const executions = await executeDashboardRefreshActions({
    request: { ...request, mode },
    actions: plannerResult.selectedActions,
    now,
  })

  return buildDashboardBackgroundRefreshReport({
    trigger: request.trigger,
    mode,
    generatedAt: now,
    executions,
    skippedReason: plannerResult.skippedReason,
  })
}
