import {
  SupabaseAuditProvider,
  SupabaseCapabilityProvider,
  SupabaseMemoryProvider,
  SupabasePolicyProvider,
  SupabaseVaultProvider,
} from "@/lib/aoc/providers/supabase";
import type { AuditProvider, CapabilityProvider, MemoryProvider, PolicyProvider, VaultProvider } from "@/lib/aoc/providers/types";
import type { OperationalDomain } from "@/lib/operational-memory";

export type AocProviders = {
  memoryProvider: MemoryProvider;
  vaultProvider: VaultProvider;
  policyProvider: PolicyProvider;
  auditProvider: AuditProvider;
  capabilityProvider: CapabilityProvider;
};

export const createDefaultAocProviders = (extractFacts: (domain: OperationalDomain, text: string) => { data: Record<string, string>; extractedFacts: string[]; completionScore: number; missingFields: string[]; confidenceScore: number }): AocProviders => ({
  memoryProvider: new SupabaseMemoryProvider(extractFacts),
  vaultProvider: new SupabaseVaultProvider(),
  policyProvider: new SupabasePolicyProvider(),
  auditProvider: new SupabaseAuditProvider(),
  capabilityProvider: new SupabaseCapabilityProvider(),
});

export * from "@/lib/aoc/providers/types";
export * from "@/lib/aoc/providers/supabase";
