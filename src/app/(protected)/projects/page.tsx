import Link from "next/link";
import { requireAuthUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createProjectAction } from "./actions";

type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
};

export default async function ProjectsPage() {
  const user = await requireAuthUser();
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("projects")
    .select("id, name, description, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const projects = (data ?? []) as ProjectRow[];

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/55 p-6 shadow-[0_30px_70px_-50px_rgba(15,23,42,0.95)] backdrop-blur-xl md:p-8">
      <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">Projects</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-50">Your projects</h1>

      <form action={createProjectAction} className="mt-7 space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="text-sm font-semibold">Create Project</h2>
        <p className="text-xs text-slate-300">Add enough context for PMFreak to establish operational memory on day one.</p>
        <input name="name" required placeholder="Project name (e.g. ERP Phase 2)" className="w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300/70" />
        <textarea name="description" placeholder="Scope, timeline pressure, major dependencies, and sponsor expectations" className="w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300/70" rows={3} />
        <button type="submit" className="rounded-xl border border-cyan-200/45 bg-cyan-400/[0.08] px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/[0.14]">Create Project</button>
      </form>

      <section className="mt-6">
        {projects.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-slate-300">
            <p className="font-semibold text-slate-100">No projects yet — let&apos;s establish your operational baseline.</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Name one active initiative with real timeline pressure.</li>
              <li>Include sponsor, dependencies, and top risk in the description.</li>
              <li>Then open Copilot to get first-week actions and escalation guidance.</li>
            </ul>
          </div>
        ) : (
          <ul className="space-y-3">
            {projects.map((project) => (
              <li key={project.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/20">
                <Link href={`/projects/${project.id}`} className="text-lg font-semibold text-cyan-200 hover:underline">{project.name}</Link>
                <p className="mt-1 text-sm text-slate-300">{project.description ?? "No description"}</p>
                <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">{project.status} • {new Date(project.created_at).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
