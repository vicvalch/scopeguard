import { z } from "zod";

import { AccessDeniedError } from "@/lib/security/access-guards";
import { denyFromAccessError } from "@/lib/security/deny-response";
import { requireAuthenticatedUser } from "@/lib/security/server-authorization";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveBootstrapRuntimeContext } from "@/lib/runtime/bootstrap/runtime";
import { logFirstUserTelemetryEvent } from "@/lib/first-user-telemetry";

const onboardingSchema = z.object({
  workspace: z.string().min(2).max(120),
  role: z.string().min(2).max(120),
  projectType: z.string().min(2).max(120),
  problem: z.string().min(10).max(5000),
  analysis: z.string().min(10).max(10000),
  source: z.enum(["manual", "ai", "import"]).default("manual"),
  createdAt: z.string().optional(),
});

type OnboardingPayload = z.infer<typeof onboardingSchema>;

export async function POST(request: Request) {
  const { user } = await requireAuthenticatedUser();

  try {
    const bootstrap = await resolveBootstrapRuntimeContext(user);
    const workspaceId = bootstrap.workspaceId;

    let payload: Partial<OnboardingPayload>;

    try {
      payload = (await request.json()) as Partial<OnboardingPayload>;
    } catch {
      return Response.json(
        {
          ok: false,
          error: "Invalid JSON payload.",
          phase: bootstrap.phase,
          workspaceId,
        },
        { status: 400 },
      );
    }

    const parsed = onboardingSchema.safeParse(payload);

    if (!parsed.success) {
      return Response.json(
        {
          ok: false,
          error: "Invalid onboarding payload.",
          details: parsed.error.flatten(),
          phase: bootstrap.phase,
          workspaceId,
        },
        { status: 400 },
      );
    }

    const {
      workspace,
      role,
      projectType,
      problem,
      analysis,
      source,
      createdAt,
    } = parsed.data;

    const parsedCreatedAt = createdAt ? new Date(createdAt) : new Date();

    if (Number.isNaN(parsedCreatedAt.getTime())) {
      return Response.json(
        {
          ok: false,
          error: "Invalid createdAt value.",
          phase: bootstrap.phase,
          workspaceId,
        },
        { status: 400 },
      );
    }

    const supabase = await createSupabaseServerClient();

    const { error: insertError } = await supabase
      .from("onboarding_analyses")
      .insert({
        company_id: user.companyId,
        user_id: user.id,
        workspace_id: workspaceId,
        workspace,
        role,
        project_type: projectType,
        problem,
        analysis,
        source,
        created_at: parsedCreatedAt.toISOString(),
      });

    if (insertError) {
      console.error("[onboarding] analysis insert failed", {
        userId: user.id,
        workspaceId,
        error: insertError.message,
      });

      return Response.json(
        {
          ok: false,
          error: "Unable to store onboarding analysis.",
          phase: bootstrap.phase,
          workspaceId,
        },
        { status: 500 },
      );
    }

    const { error: authError } = await supabase.auth.updateUser({
      data: {
        onboarding_completed: true,
      },
    });

    if (authError) {
      console.error("[onboarding] metadata update failed", {
        userId: user.id,
        workspaceId,
        error: authError.message,
      });

      return Response.json(
        {
          ok: false,
          error: "Onboarding stored but metadata update failed.",
          phase: bootstrap.phase,
          workspaceId,
        },
        { status: 500 },
      );
    }

    try {
      await logFirstUserTelemetryEvent({
        eventType: "onboarding_completed",
        userId: user.id,
        workspaceId,
        metadata: {
          bootstrapEvent: "bootstrap_onboarding_analysis_completed",
          runtimeBootstrapId: bootstrap.runtimeBootstrapId,
          role,
          projectType,
          source,
        },
      });
    } catch (telemetryError) {
      console.warn("[onboarding] telemetry skipped", {
        userId: user.id,
        workspaceId,
        error: String(telemetryError),
      });
    }

    return Response.json({
      ok: true,
      workspaceId,
      phase: bootstrap.phase,
    });
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return denyFromAccessError(error, {
        status: 403,
        routeId: "/api/onboarding",
        message: "Invalid onboarding bootstrap context.",
        actorUserId: user.id,
        eventType: "workspace_scope_violation",
      });
    }

    console.error("[onboarding] unexpected failure", {
      userId: user.id,
      error: String(error),
    });

    return Response.json(
      {
        ok: false,
        error: "Unexpected onboarding failure.",
      },
      { status: 500 },
    );
  }
}
