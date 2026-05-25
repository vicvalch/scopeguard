import { validateDashboardApiRequest } from './request-validator.ts'
import { resolveDashboardSourceData } from './source-data-resolver.ts'
import { buildDashboardApiResponse } from './dashboard-api-response-builder.ts'
import { buildDashboardApiErrorResponse } from './dashboard-api-error-handler.ts'
import type { DashboardApiResponse, DashboardSourceData } from './types.ts'

export function runDashboardApiRuntime(
  requestInput: unknown,
  preloadedSourceData?: DashboardSourceData,
): DashboardApiResponse {
  const validation = validateDashboardApiRequest(requestInput)

  if (!validation.valid || !validation.request) {
    return buildDashboardApiErrorResponse(validation.errors)
  }

  const { sourceData, warnings } = resolveDashboardSourceData(
    validation.request,
    preloadedSourceData,
  )

  return buildDashboardApiResponse({
    request: validation.request,
    sourceData,
    warnings,
  })
}
