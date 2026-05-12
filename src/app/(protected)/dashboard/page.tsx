import Link from "next/link";
import { ModuleShell } from "@/components/pmfreak/module-shell";
import { FirstUserTelemetryEvent } from "@/components/pmfreak/telemetry/first-user-client-events";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  const params = await searchParams;
  const currentProjectId = params.projectId;
  const withProjectScope = (href: string) =>
    currentProjectId ? `${href}?projectId=${currentProjectId}` : href;

  return (
    <>
      <FirstUserTelemetryEvent eventType="first_workspace_loaded" />
      <ModuleShell
        title="Operational Home"
        subtitle="See where delivery can slip, what context changed, and the next move PMFreak recommends."
        metrics={[
          { label: "Operational State", value: "Live" },
          { label: "Context Memory", value: "Tracking" },
          { label: "Project Scope", value: currentProjectId ? "Project" : "Portfolio" },
          { label: "Next Action", value: currentProjectId ? "Ready" : "Select scope" },
        ]}
      >
        <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Purpose</p>
          <p className="mt-2 text-sm text-slate-200">PMFreak turns operational chaos into one calm command loop: capture signal, preserve memory, identify pressure, execute next action.</p>
          {!currentProjectId ? (
            <div className="mt-3 rounded-2xl border border-cyan-300/40 bg-cyan-400/10 p-3 text-sm text-cyan-100">
              <p className="font-semibold">Start here in 2 minutes</p>
              <ol className="mt-2 list-decimal space-y-1 pl-4 text-cyan-100/90">
                <li>Create your first project with sponsor + timeline.</li>
                <li>Open Copilot and ask for the top 24h risks.</li>
                <li>Use Executive view for a ready-to-send status summary.</li>
              </ol>
            </div>
          ) : (
            <p className="mt-2 text-sm text-cyan-200">Project scope is active. Every module now keeps context for {currentProjectId}.</p>
          )}
        </section>
        <section className="grid gap-4 md:grid-cols-2">
          {[
            ["Input Hub", "Capture meeting notes, blockers, dependencies, and escalations so PMFreak can reason with real signal.", "/input-hub"],
            ["Executive", "Instantly see what deserves leadership attention and how to communicate it with confidence.", "/executive"],
            ["Follow-up", "Convert guidance into accountable actions and close execution loops.", "/follow-up-dashboard"],
            ["Command Center", "Focus the team on the highest instability before it turns into executive fire drills.", "/command-center"],
          ].map(([title, text, href]) => (
            <Link key={title} href={withProjectScope(href as string)} className="rounded-2xl border border-white/10 bg-white/20 p-4 hover:border-cyan-300/40">
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-slate-300">{text}</p>
            </Link>
          ))}
        </section>
      </ModuleShell>
    </>
  );
}
