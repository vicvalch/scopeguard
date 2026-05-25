import { buildFallbackDTO } from './dashboard-api-response-builder.ts'
import type { DashboardApiError, DashboardApiResponse } from './types.ts'

export function buildDashboardApiErrorResponse(errors: DashboardApiError[]): DashboardApiResponse {
  return {
    status: 'error',
    data: buildFallbackDTO(),
    warnings: errors.map((e) => e.message),
  }
}
