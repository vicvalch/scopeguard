import type { DashboardManualPushRequest, DashboardManualPushReport } from './types.ts'
import { buildManualPushEnvelopes } from './push-envelope-builder.ts'
import { simulateManualTaskPush } from './push-simulation-engine.ts'
import { buildManualTaskPushReport } from './push-report-builder.ts'

export function runDashboardManualTaskPush(
  request: DashboardManualPushRequest,
): DashboardManualPushReport {
  const generatedAt = new Date().toISOString()

  const { eligibilities, envelopes } = buildManualPushEnvelopes({ request, now: generatedAt })

  const simulations = simulateManualTaskPush({ envelopes })

  return buildManualTaskPushReport({
    request,
    eligibilities,
    envelopes,
    simulations,
    generatedAt,
  })
}
