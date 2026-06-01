"use server";

import { getAuthUser } from "@/lib/auth";
import { resolveCanonicalWorkspace } from "@/lib/workspaces/canonical-workspace-resolver";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import type { PmoTenant } from "./pmo-tenant-types";
import { validatePmoTenantPayload } from "./pmo-tenant-validate";

// Explicit three-state contract — callers must handle all three.
export type PmoTenantSaveResult =
  | { status: "success" }
  | { status: "recoverable_failure"; error: string }
  | { status: "fatal_failure"; error: string };

const PMO_TENANT_SCHEMA_VERSION = 2;

export async function savePmoTenant(tenant: PmoTenant): Promise<PmoTenantSaveResult> {
  let upsertedWorkspaceId: string | null = null;
  let supabaseClient: ReturnType<typeof createSupabaseServiceRoleClient> | null = null;

  try {
    const validation = validatePmoTenantPayload(tenant);
    if (!validation.ok) {
      console.error("[pmo:save] fatal_failure reason=validation_failed", { errors: validation.errors });
      return { status: "fatal_failure", error: "Invalid PMO configuration." };
    }

    const user = await getAuthUser();
    if (!user) {
      console.error("[pmo:save] fatal_failure reason=unauthenticated");
      return { status: "fatal_failure", error: "Not authenticated." };
    }

    const resolution = await resolveCanonicalWorkspace(user.id);
    if (!resolution.workspaceId) {
      console.error("[pmo:save] fatal_failure reason=no_workspace user_id=%s", user.id);
      return { status: "fatal_failure", error: "No active workspace found for this account." };
    }

    supabaseClient = createSupabaseServiceRoleClient({
      routeId: "pmo/save-pmo-tenant",
      operation: "upsert",
      reason: "pmo_tenant_activation",
      workspaceId: resolution.workspaceId,
      actorUserId: user.id,
    });

    const { error: upsertError } = await supabaseClient.from("workspace_governance").upsert(
      {
        workspace_id: resolution.workspaceId,
        schema_version: PMO_TENANT_SCHEMA_VERSION,
        governance_jsonb: tenant as unknown as Record<string, unknown>,
        status: "active",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id" }
    );

    if (upsertError) {
      console.error("[pmo:save] recoverable_failure reason=upsert_error workspace_id=%s msg=%s", resolution.workspaceId, upsertError.message);
      return { status: "recoverable_failure", error: "Failed to save PMO configuration. Please try again." };
    }

    // Track that the upsert landed so we can roll back on subsequent failure.
    upsertedWorkspaceId = resolution.workspaceId;

    // Mark onboarding complete — non-fatal: the governance row is the canonical proof.
    const { error: metaError } = await supabaseClient.auth.admin.updateUserById(user.id, {
      user_metadata: { onboarding_completed: true },
    });
    if (metaError) {
      console.warn("[pmo:save] non_fatal reason=metadata_update_failed user_id=%s msg=%s", user.id, metaError.message);
    }

    console.info("[pmo:save] success workspace_id=%s schema_version=%d", upsertedWorkspaceId, PMO_TENANT_SCHEMA_VERSION);
    return { status: "success" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[pmo:save] recoverable_failure reason=unexpected_exception msg=%s", message);

    // Explicit rollback: if the upsert landed before the exception, undo it.
    if (upsertedWorkspaceId && supabaseClient) {
      try {
        await supabaseClient
          .from("workspace_governance")
          .delete()
          .eq("workspace_id", upsertedWorkspaceId);
        console.warn("[pmo:save] rollback executed workspace_id=%s", upsertedWorkspaceId);
      } catch (rollbackErr) {
        const rbMsg = rollbackErr instanceof Error ? rollbackErr.message : "unknown";
        console.error("[pmo:save] rollback_failed workspace_id=%s msg=%s", upsertedWorkspaceId, rbMsg);
      }
    }

    return { status: "recoverable_failure", error: "An unexpected error occurred. Please try again." };
  }
}
