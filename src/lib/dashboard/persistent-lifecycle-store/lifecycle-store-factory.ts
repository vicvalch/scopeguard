import type { DashboardPersistentLifecycleStoreConfig, DashboardPersistentLifecycleStoreHealth } from './types'
import { createSupabasePersistentLifecycleStore, getSupabaseLifecycleStoreHealth } from './supabase-lifecycle-store'
import { createVaultPersistentLifecycleStore, type DashboardVaultLifecycleStoreContract } from './vault-lifecycle-store-contract'

export function createPersistentLifecycleStore(input: {
  config: DashboardPersistentLifecycleStoreConfig
  supabaseClient?: any
  vaultProvider?: DashboardVaultLifecycleStoreContract
}) {
  if (input.config.provider === 'supabase') {
    return createSupabasePersistentLifecycleStore({ client: input.supabaseClient, config: input.config })
  }
  return createVaultPersistentLifecycleStore(input.vaultProvider)
}

export function getPersistentLifecycleStoreHealth(input: {
  config: DashboardPersistentLifecycleStoreConfig
  supabaseClient?: any
  vaultProvider?: DashboardVaultLifecycleStoreContract
}): DashboardPersistentLifecycleStoreHealth {
  if (input.config.provider === 'supabase') return getSupabaseLifecycleStoreHealth(input.supabaseClient)
  const healthy = !!input.vaultProvider
  return {
    provider: 'vault',
    healthy,
    warnings: healthy ? [] : ['Vault/BYOS provider is not configured.'],
    errors: healthy ? [] : ['Vault/BYOS lifecycle store provider missing.'],
  }
}
