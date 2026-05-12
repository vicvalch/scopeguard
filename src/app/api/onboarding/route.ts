import { getAuthUser } from "@/lib/auth";
import { AccessDeniedError, requireWorkspaceMembership } from "@/lib/security/access-guards";
import { denyFromAccessError, denyResponse } from "@/lib/security/deny-response";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensurePersonalWorkspaceForUser } from "@/lib/workspaces";
import { logFirstUserTelemetryEvent } from "@/lib/first-user-telemetry";

type OnboardingPayload = {
  workspace: string;
  role: string;
  projectType: string;
  problem: string;
  analysis: string;
  source: "onboarding";
  createdAt: string;
};

const normalize = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export async function POST(request: Request) {
  const user = await getAuthUser();

  if (!user) {
    return denyResponse({ status: 401, routeId: "/api/onboarding", message: "Unauthorized", reason: "unauthorized" });
  }
  const workspaceId = request.headers.get("x-pmf-workspace-id");
  if (!workspaceId) return denyResponse({ status: 403, routeId: "/api/onboarding", message: "Workspace context required.", reason: "workspace_missing", eventType: "workspace_scope_violation", actorUserId: user.id });
  try {
    await requireWorkspaceMembership(workspaceId);
  } catch (error) {
    if (error instanceof AccessDeniedError) return denyFromAccessError(error, { status: 403, routeId: "/api/onboarding", message: "Invalid workspace context.", actorUserId: user.id, workspaceId, eventType: "workspace_scope_violation" });
    throw error;
  }

  let payload: Partial<OnboardingPayload>;

  try {
    payload = (await request.json()) as Partial<OnboardingPayload>;
  } catch {
    return Response.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const workspace = normalize(payload.workspace);
  const role = normalize(payload.role);
  const projectType = normalize(payload.projectType);
  const problem = normalize(payload.problem);
  const analysis = normalize(payload.analysis);
  const source = payload.source === "onboarding" ? payload.source : "onboarding";
  const createdAt = normalize(payload.createdAt);
  const parsedCreatedAt = createdAt ? new Date(createdAt) : new Date();

  if (!workspace || !role || !projectType || !problem || !analysis) {
    return Response.json({ error: "Missing required onboarding fields." }, { status: 400 });
  }

  if (Number.isNaN(parsedCreatedAt.getTime())) {
    return Response.json({ error: "Invalid createdAt timestamp." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("onboarding_analyses").insert({
    company_id: user.companyId,
    user_id: user.id,
    workspace,
    role,
    project_type: projectType,
    problem,
    analysis,
    source,
    created_at: parsedCreatedAt.toISOString(),
  });

  if (error) {
    return Response.json({ error: "Unable to save onboarding analysis." }, { status: 500 });
  }

  await ensurePersonalWorkspaceForUser(user.id);

  const { error: authError } = await supabase.auth.updateUser({
    data: { onboarding_completed: true },
  });

  if (authError) {
    return Response.json({ error: "Onboarding was saved, but completion state could not be updated." }, { status: 500 });
  }

  const { data: sessionData } = await supabase.auth.getSession();

  await logFirstUserTelemetryEvent({ eventType: "onboarding_completed", userId: user.id, workspaceId, metadata: { source } });

  return Response.json({ ok: true, session: sessionData });
}
