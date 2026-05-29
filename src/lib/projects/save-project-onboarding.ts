"use server";

import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { canCreateMoreProjects } from "@/lib/feature-gates";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureUserWorkspace } from "@/lib/workspaces";
import type { ProjectOnboardingPayload } from "./project-onboarding-types";

export type ProjectOnboardingSaveResult =
  | { ok: true; projectId: string }
  | { ok: false; error: string };

export async function saveProjectOnboarding(
  payload: ProjectOnboardingPayload
): Promise<ProjectOnboardingSaveResult> {
  try {
    const user = await getAuthUser();
    if (!user) return { ok: false, error: "Not authenticated" };

    const projectAccess = await canCreateMoreProjects(user.id);
    if (!projectAccess.ok) {
      return { ok: false, error: "upgrade_required" };
    }

    const ensured = await ensureUserWorkspace(user.id);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        workspace_id: ensured.workspaceId,
        name: payload.identity.projectName,
        description: payload.deliveryContext.problemStatement || null,
        status: "active",
        onboarding_payload: payload as unknown as Record<string, unknown>,
      })
      .select("id")
      .single<{ id: string }>();

    if (error || !data?.id) {
      console.error("[project] insert failed:", error?.message);
      return { ok: false, error: error?.message ?? "Unable to create project" };
    }

    return { ok: true, projectId: data.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[project] saveProjectOnboarding error:", message);
    return { ok: false, error: "An unexpected error occurred. Please try again." };
  }
}

export async function activateProjectBrainAction(payload: ProjectOnboardingPayload) {
  const result = await saveProjectOnboarding(payload);
  if (result.ok) {
    redirect(`/projects/${result.projectId}`);
  } else if (result.error === "upgrade_required") {
    redirect("/projects?error=upgrade_required");
  } else {
    redirect(`/projects/new?error=${encodeURIComponent(result.error)}`);
  }
}
