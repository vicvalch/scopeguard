import type { DashboardPersistentLifecycleStoreConfig, DashboardPersistentLifecycleStoreHealth, DashboardTaskLifecycleStore } from './types'
import { buildLifecycleScopeFilter, mapLifecycleToPersistentRecord, mapPersistentRecordToLifecycle, type PersistentLifecycleRecord } from './lifecycle-record-mapper'
import { mapEventToPersistentRecord, mapPersistentRecordToEvent, type PersistentLifecycleEventRecord } from './lifecycle-event-mapper'

const EVENTS_TABLE = 'dashboard_task_lifecycle_events'

function applyScope(query: any, tenantId: string, workspaceId?: string) {
  const scope = buildLifecycleScopeFilter(tenantId, workspaceId)
  query = query.eq('tenant_id', scope.tenant_id)
  query = scope.workspace_id === null ? query.is('workspace_id', null) : query.eq('workspace_id', scope.workspace_id)
  return query
}

export function createSupabasePersistentLifecycleStore(input: {
  client: any
  config: DashboardPersistentLifecycleStoreConfig
}): DashboardTaskLifecycleStore & { getLifecycleById(id: string): Promise<any>; getEventsForLifecycle(lifecycleId: string): Promise<any[]> } {
  const { client, config } = input
  const lifecycleTable = config.tableName ?? 'dashboard_task_lifecycle_records'

  return {
    async saveLifecycle(record) {
      const payload = mapLifecycleToPersistentRecord({ tenantId: config.tenantId, workspaceId: config.workspaceId, lifecycle: record })
      await client.from(lifecycleTable).upsert(payload, { onConflict: 'tenant_id,workspace_id,lifecycle_id' })
    },
    async saveEvent(event) {
      const payload = mapEventToPersistentRecord({ tenantId: config.tenantId, workspaceId: config.workspaceId, event })
      await client.from(EVENTS_TABLE).insert(payload, { onConflict: 'event_id', ignoreDuplicates: true })
    },
    async getLifecycle(id) {
      const row = await this.getLifecycleById(id)
      return row
    },
    async getLifecycleByEnvelopeId(envelopeId) {
      let query = client.from(lifecycleTable).select('*')
      query = applyScope(query, config.tenantId, config.workspaceId).eq('envelope_id', envelopeId)
      const { data } = await query.maybeSingle()
      return data ? mapPersistentRecordToLifecycle(data as PersistentLifecycleRecord) : null
    },
    async listLifecycles() {
      let query = client.from(lifecycleTable).select('*')
      query = applyScope(query, config.tenantId, config.workspaceId).order('updated_at', { ascending: true }).order('lifecycle_id', { ascending: true })
      const { data } = await query
      return (data ?? []).map((x: PersistentLifecycleRecord) => mapPersistentRecordToLifecycle(x))
    },
    async listEvents(lifecycleId) {
      let query = client.from(EVENTS_TABLE).select('*')
      query = applyScope(query, config.tenantId, config.workspaceId)
      if (lifecycleId) query = query.eq('lifecycle_id', lifecycleId)
      query = query.order('occurred_at', { ascending: true }).order('event_id', { ascending: true })
      const { data } = await query
      return (data ?? []).map((x: PersistentLifecycleEventRecord) => mapPersistentRecordToEvent(x))
    },
    async getLifecycleById(id: string) {
      let query = client.from(lifecycleTable).select('*')
      query = applyScope(query, config.tenantId, config.workspaceId).eq('lifecycle_id', id)
      const { data } = await query.maybeSingle()
      return data ? mapPersistentRecordToLifecycle(data as PersistentLifecycleRecord) : null
    },
    async getEventsForLifecycle(lifecycleId: string) {
      return this.listEvents(lifecycleId)
    },
  }
}

export function getSupabaseLifecycleStoreHealth(client: any): DashboardPersistentLifecycleStoreHealth {
  const warnings: string[] = []
  const errors: string[] = []
  if (!client) errors.push('Supabase client is missing.')
  if (client && typeof client.from !== 'function') errors.push('Supabase client missing from().')
  if (client && typeof client.rpc !== 'function') warnings.push('Supabase client missing rpc(); health checks limited.')
  return { provider: 'supabase', healthy: errors.length === 0, warnings, errors }
}
