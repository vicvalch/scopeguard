import type { DashboardSeverity, InterventionQueueItemDTO } from './types'

const MAX_INTERVENTIONS = 15

const URGENCY_SORT_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

function mapUrgencyToSeverity(urgency: string): DashboardSeverity {
  if (urgency === 'critical') return 'critical'
  if (urgency === 'high' || urgency === 'medium') return 'warning'
  return 'info'
}

export function adaptInterventionQueue(interventionReport: any): InterventionQueueItemDTO[] {
  if (!interventionReport) return []

  const interventions: unknown[] = interventionReport.interventions ?? []

  return interventions
    .slice()
    .sort((a: any, b: any) => {
      const aOrder = URGENCY_SORT_ORDER[a.urgency ?? 'low'] ?? 3
      const bOrder = URGENCY_SORT_ORDER[b.urgency ?? 'low'] ?? 3
      return aOrder - bOrder
    })
    .slice(0, MAX_INTERVENTIONS)
    .map((intervention: any): InterventionQueueItemDTO => ({
      id: intervention.id ?? '',
      title: intervention.title ?? '',
      urgency: mapUrgencyToSeverity(intervention.urgency ?? 'low'),
      ownerLane: intervention.ownerLane ?? '',
      cadence: intervention.recommendedCadence ?? '',
      affectedProjects: intervention.affectedProjects ?? [],
    }))
}
