"use server";

import { getAuthUser } from "@/lib/auth";
import { resolveCanonicalWorkspace } from "@/lib/workspaces/canonical-workspace-resolver";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import type { PmoTenant } from "./pmo-tenant-types";

export type PmoTenantSaveResult = { ok: boolean; error?: string };

const PMO_TENANT_SCHEMA_VERSION = 2;

export async function savePmoTenant(tenant: PmoTenant): Promise<PmoTenantSaveResult> {
  try {
    const user = await getAuthUser();
    if (!user) return { ok: false, error: "Not authenticated" };

    const resolution = await resolveCanonicalWorkspace(user.id);
    if (!resolution.workspaceId) {
      return { ok: false, error: "No active workspace found for user" };
    }

    const supabase = createSupabaseServiceRoleClient({
      routeId: "pmo/save-pmo-tenant",
      operation: "upsert",
      reason: "pmo_tenant_activation",
      workspaceId: resolution.workspaceId,
      actorUserId: user.id,
    });

    const { error } = await supabase.from("workspace_governance").upsert(
      {
        workspace_id: resolution.workspaceId,
        schema_version: PMO_TENANT_SCHEMA_VERSION,
        governance_jsonb: tenant as unknown as Record<string, unknown>,
        status: "active",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id" }
    );

    if (error) {
      console.error("[pmo] pmo_tenant upsert failed:", error.message);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[pmo] savePmoTenant error:", message);
    return { ok: false, error: message };
  }
}
