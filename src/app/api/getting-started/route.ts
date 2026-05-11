import { getAuthUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { saveOperationalMemory, type OperationalDomain } from "@/lib/operational-memory";

type TemplateInput = { domain: OperationalDomain; title: string; text: string };

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as { form: Record<string, string>; templates: TemplateInput[]; loadDemo?: boolean };
  const supabase = await createSupabaseServerClient();

  const projectName = body.loadDemo ? "PMFreak Demo Launch Recovery" : body.form.projectName || "First Activated Project";
  const description = body.loadDemo
    ? "Seeded scenario with governance drift, PM overload, and escalation pressure."
    : `Sponsor: ${body.form.sponsor || "TBD"} | PM: ${body.form.pm || "TBD"} | Timeline: ${body.form.timeline || "TBD"}`;

  const { data: project, error } = await supabase.from("projects").insert({ user_id: user.id, name: projectName, description }).select("id").single<{ id: string }>();
  if (error || !project) return Response.json({ error: "Unable to create project" }, { status: 500 });

  const demoAppend: TemplateInput[] = body.loadDemo ? [
    { domain: "risk_intelligence", title: "Escalation signal", text: "Risk name: Steering committee confidence erosion | Severity: high | Probability: high | Escalation needed: yes" },
    { domain: "team_health", title: "PM fatigue signal", text: "PM name: Jordan | Workload level: very high | After hours activity: sustained | Fatigue risk: high" },
    { domain: "pmo_governance", title: "Governance gap", text: "Reporting cadence: inconsistent | Approval rules: unclear | Escalation rules: missing" },
  ] : [];

  for (const t of [...body.templates, ...demoAppend]) {
    await saveOperationalMemory({ companyId: user.companyId, projectId: project.id, domain: t.domain, title: t.title, text: t.text, sourceRef: body.loadDemo ? "activation-demo" : "activation" });
  }

  await supabase.auth.updateUser({ data: { onboarding_completed: true, company_name: body.form.companyName || user.companyName } });
  return Response.json({ ok: true, projectId: project.id });
}
