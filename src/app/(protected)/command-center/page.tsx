import { activateContextAction } from "./actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAuthUser } from "@/lib/auth";
import { ensureUserWorkspace } from "@/lib/workspaces";
import { CommandCenterClient } from "@/features/command-center/command-center-client";
import { GuidedEmptyState } from "@/components/pmfreak/onboarding/GuidedEmptyState";
import { resolveActiveProject } from "@/lib/resolve-active-project";
import { getCompanySubscription } from "@/lib/billing";
import { getPlanCapabilities } from "@/lib/feature-gates";

export default async function CommandCenterPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; projectId?: string }>;
}) {
  const user = await requireAuthUser();
  const workspace = await ensureUserWorkspace(user.id);
  const supabase = await createSupabaseServerClient();
  const params = await searchParams;
  const fromOnboarding = params.from === "onboarding";
  const subscription = await getCompanySubscription(user.companyId);
  const capabilities = getPlanCapabilities(subscription.plan);

  const { data: projects } = await supabase
    .from("projects")
    .select("id,name")
    .eq("workspace_id", workspace.workspaceId)
    .order("created_at", { ascending: false });

  if ((projects ?? []).length === 0) {
    return (
      <div className="space-y-5 pb-10">
        {/* Activation header */}
        <section className="relative overflow-hidden rounded-3xl border border-indigo-400/25 bg-gradient-to-br from-indigo-400/[0.07] via-white/[0.03] to-transparent p-8 shadow-[0_24px_60px_-30px_rgba(99,102,241,0.3)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.1),transparent_60%)]" />
          <div className="relative">
            {/* Pulse badge */}
            <div className="mb-5 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-400" />
              </span>
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-indigo-400">
                PMFreak — Awaiting Operational Context
              </p>
            </div>

            <h1 className="text-3xl font-semibold tracking-tight text-slate-100 sm:text-4xl">
              Activate your first operational context
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
              PMFreak needs one real initiative to begin sensing execution risk, stakeholder dynamics,
              meeting debt, and follow-up pressure. Your Command Center activates once context exists.
            </p>

            {/* Context activation form */}
            <form
              action={activateContextAction}
              className="mt-8 space-y-5 rounded-2xl border border-white/8 bg-white/[0.04] p-6"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Operational context
                </p>
                <p className="mt-0.5 text-[11px] text-slate-600">
                  PMFreak agents activate as soon as this context is saved.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-slate-300">Initiative name</span>
                  <span className="block text-[11px] text-slate-600">The initiative PMFreak will begin monitoring</span>
                  <input
                    required
                    name="name"
                    placeholder="Q3 Enterprise Platform Rollout"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none transition focus:border-indigo-400/50 focus:bg-indigo-400/[0.04]"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-slate-300">Customer / sponsor</span>
                  <span className="block text-[11px] text-slate-600">Executive accountable for delivery</span>
                  <input
                    name="sponsor"
                    placeholder="VP Operations"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none transition focus:border-indigo-400/50 focus:bg-indigo-400/[0.04]"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-slate-300">Current phase</span>
                  <span className="block text-[11px] text-slate-600">Where the initiative sits in its lifecycle</span>
                  <input
                    name="phase"
                    placeholder="Pilot execution"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none transition focus:border-indigo-400/50 focus:bg-indigo-400/[0.04]"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-slate-300">Timeline pressure</span>
                  <span className="block text-[11px] text-slate-600">PMFreak calibrates urgency from this signal</span>
                  <input
                    name="timeline"
                    placeholder="High — board update in 3 weeks"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none transition focus:border-indigo-400/50 focus:bg-indigo-400/[0.04]"
                  />
                </label>

                <label className="space-y-1.5 md:col-span-2">
                  <span className="text-xs font-medium text-slate-300">Top known risk</span>
                  <input
                    name="risk"
                    placeholder="Cross-team dependency delays"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none transition focus:border-indigo-400/50 focus:bg-indigo-400/[0.04]"
                  />
                </label>

                <label className="space-y-1.5 md:col-span-2">
                  <span className="text-xs font-medium text-slate-300">Key stakeholders</span>
                  <input
                    name="stakeholders"
                    placeholder="Ops lead, Finance partner, Vendor PM"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none transition focus:border-indigo-400/50 focus:bg-indigo-400/[0.04]"
                  />
                </label>

                <label className="space-y-1.5 md:col-span-2">
                  <span className="text-xs font-medium text-slate-300">Operational context</span>
                  <span className="block text-[11px] text-slate-600">
                    Describe the initiative PMFreak should begin monitoring — objectives, constraints, pressure
                    points. More context improves signal accuracy.
                  </span>
                  <textarea
                    name="description"
                    rows={5}
                    placeholder="Add initiative context, objectives, constraints, and current pressure points."
                    className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none transition focus:border-indigo-400/50 focus:bg-indigo-400/[0.04]"
                  />
                </label>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  className="rounded-xl border border-indigo-400/50 bg-indigo-500/20 px-6 py-2.5 text-sm font-semibold text-slate-100 shadow-[0_0_24px_-8px_rgba(99,102,241,0.5)] transition hover:bg-indigo-500/30"
                >
                  Activate PMFreak Agents
                </button>
                <p className="text-[11px] text-slate-600">Context can be refined after activation</p>
              </div>
            </form>
          </div>
        </section>

        {/* Supporting context */}
        <div className="grid gap-4 lg:grid-cols-2">
          <GuidedEmptyState
            signal="Agents standing by"
            title="Four intelligence layers are waiting"
            description="Once you activate a context, PMFreak's agent network begins monitoring your initiative across four operational dimensions simultaneously."
            why="PMFreak will begin sensing stakeholder confidence drift once interactions are logged. Operational risk telemetry becomes more accurate as meetings are ingested."
            actions={[
              { label: "Execution Risk monitor", sublabel: "tracks delivery confidence and blocker accumulation" },
              { label: "Stakeholder Dynamics monitor", sublabel: "detects alignment drift and political risk" },
              { label: "Meeting Debt monitor", sublabel: "surfaces follow-up pressure and accountability gaps" },
              { label: "Follow-up Pressure monitor", sublabel: "prevents commitment slippage" },
            ]}
          />

          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">What happens next</p>
            <ol className="mt-4 space-y-3">
              {[
                { n: "01", text: "PMFreak creates your operational context and calibrates risk telemetry." },
                { n: "02", text: "Agents begin monitoring risk, stakeholders, meetings, and follow-ups." },
                { n: "03", text: "The Command Center becomes live — signals populate in real time." },
                { n: "04", text: "Recommended actions guide your first operational interventions." },
              ].map(({ n, text }) => (
                <li key={n} className="flex gap-3">
                  <span className="mt-0.5 shrink-0 text-[10px] font-bold text-indigo-400">{n}</span>
                  <p className="text-sm text-slate-400">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    );
  }

  const projectList = (projects ?? []) as { id: string; name: string }[];
  const resolution = resolveActiveProject(projectList, params.projectId);

  if (resolution.invalidId) {
    return (
      <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.05] p-6">
        <p className="text-sm font-semibold text-amber-200">Project not found in this workspace</p>
        <p className="mt-1 text-xs text-slate-400">
          The project referenced in the URL does not belong to your active workspace or you do not have
          access. Select a project below or navigate to the Command Center without a project filter.
        </p>
        <a
          href="/command-center"
          className="mt-3 inline-block rounded-xl border border-indigo-400/40 bg-indigo-400/10 px-4 py-2 text-xs font-medium text-indigo-200 transition hover:bg-indigo-400/15"
        >
          Reset to default project
        </a>
      </div>
    );
  }

  return (
    <CommandCenterClient
      firstRun={fromOnboarding}
      projectId={resolution.project!.id}
      projectName={resolution.project!.name}
      workspaceId={workspace.workspaceId}
      projects={projectList}
      role={user.role}
      onboardingCompleted={user.onboardingCompleted}
      planTier={subscription.plan}
      canUseAdvancedAi={capabilities.advanced_ai_actions}
      canUsePortfolioMemory={capabilities.organizational_memory}
      canUseGovernanceDirectives={capabilities.governance_directives}
    />
  );
}
