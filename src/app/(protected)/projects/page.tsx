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
    <main className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl md:p-10">
      <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">Projects</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Your projects</h1>

      <form action={createProjectAction} className="mt-6 space-y-3 rounded-2xl border border-white/10 bg-white/20 p-5">
        <h2 className="text-sm font-semibold">Create Project</h2>
        <input name="name" required placeholder="Project name" className="w-full rounded-xl border border-white/15 bg-white/30 px-3 py-2 text-sm" />
        <textarea name="description" placeholder="Short description (optional)" className="w-full rounded-xl border border-white/15 bg-white/30 px-3 py-2 text-sm" rows={3} />
        <button type="submit" className="rounded-xl border border-cyan-300/50 px-4 py-2 text-sm font-semibold">Create Project</button>
      </form>

      <section className="mt-6">
        {projects.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/20 p-5 text-sm text-slate-300">No projects yet. Create your first project above.</div>
        ) : (
          <ul className="space-y-3">
            {projects.map((project) => (
              <li key={project.id} className="rounded-2xl border border-white/10 bg-white/20 p-4">
                <Link href={`/projects/${project.id}`} className="text-lg font-semibold text-cyan-200 hover:underline">{project.name}</Link>
                <p className="mt-1 text-sm text-slate-300">{project.description ?? "No description"}</p>
                <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">{project.status} • {new Date(project.created_at).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
