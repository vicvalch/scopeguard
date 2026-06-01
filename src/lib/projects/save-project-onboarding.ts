"use server";

import { getAuthUser } from "@/lib/auth";
import { canCreateMoreProjects } from "@/lib/feature-gates";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureUserWorkspace } from "@/lib/workspaces";
import type { ProjectOnboardingPayload } from "./project-onboarding-types";

export type ProjectSaveResult =
  | { status: "success"; projectId: string }
  | { status: "recoverable_failure"; error: string }
  | { status: "fatal_failure"; error: string };

function validatePayload(payload: ProjectOnboardingPayload): string | null {
  if (!payload?.identity?.projectName?.trim()) return "Project name is required";
  if (!payload?.identity?.clientOrganization?.trim()) return "Client organization is required";
  if (!payload?.identity?.projectType) return "Project type is required";
  if (!payload?.identity?.pmAssigned?.trim()) return "PM assigned is required";
  if (!payload?.deliveryContext?.problemStatement?.trim()) return "Problem statement is required";
  if (!payload?.deliveryContext?.mainDeliverable?.trim()) return "Main deliverable is required";
  return null;
}

function structuredLog(event: string, fields: Record<string, unknown>) {
  console.info(JSON.stringify({ event, ...fields, ts: new Date().toISOString() }));
}

export async function saveProjectOnboarding(
  payload: ProjectOnboardingPayload,
  correlationId?: string
): Promise<ProjectSaveResult> {
  const cid = correlationId ?? `proj_${Date.now()}`;

  try {
    const user = await getAuthUser();
    if (!user) {
      structuredLog("project.create.failed", {
        correlationId: cid,
        failureClass: "fatal_failure",
        reason: "unauthenticated",
      });
      return { status: "fatal_failure", error: "Not authenticated. Please sign in and try again." };
    }

    const validationError = validatePayload(payload);
    if (validationError) {
      structuredLog("project.create.failed", {
        correlationId: cid,
        failureClass: "fatal_failure",
        reason: "invalid_payload",
        detail: validationError,
        userId: user.id,
      });
      return { status: "fatal_failure", error: validationError };
    }

    structuredLog("project.create.started", { correlationId: cid, userId: user.id });

    const projectAccess = await canCreateMoreProjects(user.id);
    if (!projectAccess.ok) {
      structuredLog("project.create.failed", {
        correlationId: cid,
        failureClass: "fatal_failure",
        reason: "upgrade_required",
        userId: user.id,
      });
      return { status: "fatal_failure", error: "upgrade_required" };
    }

    let ensured: { workspaceId: string };
    try {
      ensured = await ensureUserWorkspace(user.id);
    } catch (wsErr) {
      const detail = wsErr instanceof Error ? wsErr.message : "unknown workspace error";
      structuredLog("project.create.failed", {
        correlationId: cid,
        failureClass: "recoverable_failure",
        reason: "workspace_error",
        detail,
        userId: user.id,
      });
      return { status: "recoverable_failure", error: "Unable to resolve workspace. Please try again." };
    }

    if (!ensured.workspaceId) {
      structuredLog("project.create.failed", {
        correlationId: cid,
        failureClass: "fatal_failure",
        reason: "missing_workspace",
        userId: user.id,
      });
      return { status: "fatal_failure", error: "No workspace found. Please contact support." };
    }

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
      structuredLog("project.create.failed", {
        correlationId: cid,
        failureClass: "recoverable_failure",
        reason: "db_insert_error",
        detail: error?.message,
        userId: user.id,
        workspaceId: ensured.workspaceId,
      });
      return {
        status: "recoverable_failure",
        error: error?.message ?? "Unable to create project. Please try again.",
      };
    }

    structuredLog("project.create.persisted", {
      correlationId: cid,
      projectId: data.id,
      userId: user.id,
      workspaceId: ensured.workspaceId,
    });

    return { status: "success", projectId: data.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    structuredLog("project.create.failed", {
      correlationId: cid,
      failureClass: "recoverable_failure",
      reason: "unexpected_exception",
      detail: message,
    });
    return { status: "recoverable_failure", error: "An unexpected error occurred. Please try again." };
  }
}
