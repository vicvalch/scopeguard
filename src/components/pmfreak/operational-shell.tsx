"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { OPERATIONAL_FLOW } from "@/features/navigation/module-registry";

type UserProject = { id: string; name: string };

type OperationalShellProps = {
  children: React.ReactNode;
  user: { fullName: string; role: string; companyName: string };
};

const neuralNodes = [
  { label: "Risk", href: "/projects", accent: "from-amber-300/20 to-red-300/10" },
  { label: "Politics", href: "/stakeholder-intel", accent: "from-violet-300/20 to-indigo-300/10" },
  { label: "Meetings", href: "/input-hub", accent: "from-cyan-300/20 to-blue-300/10" },
  { label: "Memory", href: "/operational-memory", accent: "from-emerald-300/20 to-teal-300/10" },
  { label: "Follow-up", href: "/follow-up-dashboard", accent: "from-fuchsia-300/20 to-pink-300/10" },
  { label: "Executive", href: "/executive", accent: "from-slate-200/20 to-zinc-300/10" },
  { label: "Command Center", href: "/command-center", accent: "from-cyan-300/20 to-fuchsia-300/10" },
];

export function OperationalShell({ children, user }: OperationalShellProps) {
  const pathname = usePathname();
  const [projects, setProjects] = useState<UserProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    const fromQuery = new URLSearchParams(window.location.search).get("projectId") ?? "";
    const fromStorage = window.localStorage.getItem("pmfreak.currentProjectId") ?? "";
    return fromQuery || fromStorage;
  });

  useEffect(() => {
    let active = true;
    async function loadProjects() {
      setProjectsLoading(true); setProjectsError(null);
      try {
        const response = await fetch("/api/projects", { cache: "no-store" });
        if (!response.ok) throw new Error();
        const data = (await response.json()) as { projects?: UserProject[] };
        if (active) setProjects(data.projects ?? []);
      } catch { if (active) { setProjects([]); setProjectsError("Project list unavailable. Continue in portfolio scope or retry."); } }
      finally { if (active) setProjectsLoading(false); }
    }
    void loadProjects(); return () => { active = false; };
  }, []);

  useEffect(() => { if (projectId) globalThis.localStorage?.setItem("pmfreak.currentProjectId", projectId); }, [projectId]);

  const scopeLabel = useMemo(() => projects.find((p) => p.id === projectId)?.name ?? "Portfolio scope", [projectId, projects]);
  const navHref = (href: string) => (projectId ? `${href}?projectId=${projectId}` : href);

  return <div className="min-h-screen bg-[#020617] text-slate-100">
    <div className="mx-auto flex w-full max-w-[1540px] gap-4 px-3 py-4 md:gap-6 md:px-5 md:py-6">
      <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-[16.2rem] flex-col rounded-3xl border border-white/10 bg-slate-950/75 p-4 shadow-[0_36px_80px_-55px_rgba(14,116,144,0.5)] backdrop-blur-xl lg:flex">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/35 p-3.5">
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-cyan-400/20 blur-2xl" />
          <p className="text-[10px] uppercase tracking-[0.34em] text-cyan-200/80">PMFREAK</p>
          <h2 className="mt-1 text-sm font-semibold text-white">Operational Intelligence Online</h2>
          <p className="mt-1 text-[11px] text-slate-400">{user.companyName}</p>
          <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-emerald-300/35 bg-emerald-300/10 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-emerald-100"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300 motion-safe:animate-pulse" />System pulse active</div>
        </div>

        <nav className="mt-4 space-y-1.5" aria-label="Neural rail">
          {neuralNodes.map((item) => {
            const active = pathname.startsWith(item.href);
            return <Link key={item.href} href={navHref(item.href)} className={`group relative block overflow-hidden rounded-xl border px-3 py-2.5 transition-all duration-300 ${active ? "border-cyan-200/35 bg-cyan-300/[0.08]" : "border-white/5 bg-white/[0.01] hover:-translate-y-0.5 hover:border-white/20"}`}><span className={`pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100 bg-gradient-to-r ${item.accent}`} /><span className={`relative text-sm ${active ? "text-cyan-100" : "text-slate-200"}`}>{item.label}</span></Link>;
          })}
        </nav>

        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Telemetry</p>
          <ul className="mt-2 space-y-1.5 text-xs text-zinc-300"><li>Signal Drift <span className="text-amber-200">+12%</span></li><li>Political Tension <span className="text-violet-200">Rising</span></li><li>Memory Confidence <span className="text-emerald-200">Stable</span></li></ul>
        </div>

        <div className="mt-auto rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-slate-300"><p className="font-semibold text-slate-100">{user.fullName}</p><p className="mt-0.5">{user.role}</p><Link href="/logout" className="mt-2 inline-flex text-cyan-200 hover:text-cyan-100">Logout</Link></div>
      </aside>

      <div className="flex-1 space-y-4 md:space-y-5">
        <div className="rounded-3xl border border-white/10 bg-slate-900/55 p-4 shadow-[0_20px_50px_-35px_rgba(8,47,73,0.8)] backdrop-blur-xl md:p-5">
          <div className="mb-4 grid gap-2.5 lg:hidden">
            <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-200/90">Neural Rail</p>
            <div className="flex snap-x gap-2 overflow-x-auto pb-1">{neuralNodes.map((item) => <Link key={item.href} href={navHref(item.href)} className={`shrink-0 rounded-lg border px-3 py-2 text-xs ${pathname.startsWith(item.href) ? "border-cyan-200/40 bg-cyan-300/10 text-cyan-100" : "border-white/10 bg-white/[0.02] text-slate-300"}`}>{item.label}</Link>)}</div>
          </div>
          <div className="flex flex-wrap items-center gap-3"><span className="text-[10px] uppercase tracking-[0.2em] text-cyan-200/90">Operational Scope</span><select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="rounded-lg border border-white/15 bg-slate-900 px-3 py-1.5 text-sm text-slate-100" disabled={projectsLoading}><option value="">Portfolio scope</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select><span className="text-xs text-slate-400">Current: {scopeLabel}</span></div>
          {projectsLoading ? <p className="mt-2 text-xs text-slate-500">Loading contexts…</p> : null}
          {projectsError ? <p className="mt-2 text-xs text-amber-200">{projectsError}</p> : null}
          {!projectsLoading && !projectsError && projects.length === 0 ? <p className="mt-2 text-xs text-cyan-200">No operational contexts yet. Agents remain in portfolio monitoring mode.</p> : null}
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">{OPERATIONAL_FLOW.map((step, idx) => <span key={step}>{step}{idx < OPERATIONAL_FLOW.length - 1 ? " →" : ""}</span>)}</div>
        </div>
        <main>{children}</main>
      </div>
    </div>
  </div>;
}
