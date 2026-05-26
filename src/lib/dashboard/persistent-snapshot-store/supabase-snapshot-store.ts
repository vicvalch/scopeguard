import type { DashboardSnapshotStore, DashboardSourceHydrationRequest, DashboardSourceSnapshot } from '../source-hydration/types.ts'
import type { DashboardSourceSnapshotRecord } from './types.ts'
import { mapRecordToSnapshot, mapSnapshotToRecord } from './snapshot-record-mapper.ts'
import { DEFAULT_DASHBOARD_SNAPSHOT_TABLE } from './types.ts'

export function createSupabaseDashboardSnapshotStore(input: {
  supabaseClient: any
  tableName?: string
}): DashboardSnapshotStore {
  const { supabaseClient, tableName = DEFAULT_DASHBOARD_SNAPSHOT_TABLE } = input

  if (!supabaseClient) {
    throw new Error('Supabase client is required for dashboard snapshot store.')
  }

  return {
    async saveSnapshot(snapshot: DashboardSourceSnapshot): Promise<void> {
      const record = mapSnapshotToRecord(snapshot)
      const { error } = await supabaseClient.from(tableName).upsert(record, { onConflict: 'id' })
      if (error) {
        throw new Error('Failed to save dashboard source snapshot.')
      }
    },

    async getLatestSnapshot(request: {
      tenantId: string
      workspaceId?: string
      portfolioId?: string
      sourceKind: string
    }): Promise<DashboardSourceSnapshot | null> {
      let query = supabaseClient
        .from(tableName)
        .select('*')
        .eq('tenant_id', request.tenantId)
        .eq('source_kind', request.sourceKind)

      if (request.workspaceId !== undefined) {
        query = query.eq('workspace_id', request.workspaceId)
      } else {
        query = query.is('workspace_id', null)
      }

      if (request.portfolioId !== undefined) {
        query = query.eq('portfolio_id', request.portfolioId)
      } else {
        query = query.is('portfolio_id', null)
      }

      query = query.order('generated_at', { ascending: false }).limit(1)

      const { data, error } = await query

      if (error) {
        throw new Error('Failed to read dashboard source snapshot.')
      }

      if (!data || data.length === 0) return null
      return mapRecordToSnapshot(data[0] as DashboardSourceSnapshotRecord)
    },

    async listLatestSnapshots(request: DashboardSourceHydrationRequest): Promise<DashboardSourceSnapshot[]> {
      let query = supabaseClient
        .from(tableName)
        .select('*')
        .eq('tenant_id', request.tenantId)

      if (request.workspaceId !== undefined) {
        query = query.eq('workspace_id', request.workspaceId)
      } else {
        query = query.is('workspace_id', null)
      }

      if (request.portfolioId !== undefined) {
        query = query.eq('portfolio_id', request.portfolioId)
      } else {
        query = query.is('portfolio_id', null)
      }

      query = query.order('generated_at', { ascending: false })

      const { data, error } = await query

      if (error) {
        throw new Error('Failed to list dashboard source snapshots.')
      }

      if (!data || data.length === 0) return []

      const latestByKind = new Map<string, DashboardSourceSnapshotRecord>()
      for (const record of data as DashboardSourceSnapshotRecord[]) {
        if (!latestByKind.has(record.source_kind)) {
          latestByKind.set(record.source_kind, record)
        }
      }

      const snapshots = Array.from(latestByKind.values()).map(mapRecordToSnapshot)
      return snapshots.sort((a, b) => a.sourceKind.localeCompare(b.sourceKind))
    },
  }
}
