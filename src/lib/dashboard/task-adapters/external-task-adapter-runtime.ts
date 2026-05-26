import type { DashboardTaskProjectionRequest, DashboardTaskProjectionReport } from './types.ts'
import { projectDashboardActions } from './adapter-projection-engine.ts'
import { buildDashboardTaskProjectionReport } from './adapter-report-builder.ts'

export function runDashboardTaskAdapterRuntime(
  request: DashboardTaskProjectionRequest,
): DashboardTaskProjectionReport {
  const normalizedRequest: DashboardTaskProjectionRequest = {
    actions: request.actions ?? [],
    adapters: request.adapters ?? [],
  }

  const projections = projectDashboardActions(normalizedRequest)
  return buildDashboardTaskProjectionReport({ request: normalizedRequest, projections })
}
