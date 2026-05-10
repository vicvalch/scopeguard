"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { OPERATIONAL_FLOW, PM_MODULES } from "@/features/navigation/module-registry";

type UserProject = { id: string; name: string };

type OperationalShellProps = {
  children: React.ReactNode;
  user: { fullName: string; role: string; companyName: string };
};

export function OperationalShell({ children, user }: OperationalShellProps) {
  const pathname = usePathname();
  const search = useSearchParams();
  const [projects, setProjects] = useState<UserProject[]>([]);
  const [projectId, setProjectId] = useState<string>(
    () =>
      search.get("projectId") ??
      globalThis.localStorage?.getItem("pmfreak.currentProjectId") ??
      "",
  );

  useEffect(() => {
    void fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => setProjects(d.projects ?? []));
  }, []);

  useEffect(() => {
    if (!projectId) return;
    globalThis.localStorage?.setItem("pmfreak.currentProjectId", projectId);
  }, [projectId]);

  const scopeLabel = useMemo(
    () => projects.find((p) => p.id === projectId)?.name ?? "Portfolio scope",
    [projectId, projects],
  );
  const navHref = (href: string) => {
    return projectId ? `${href}?projectId=${projectId}` : href;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="mx-auto flex w-full max-w-7xl gap-6 px-5 py-6 md:px-8 md:py-8">
        <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] w-72 flex-col rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl lg:flex">
          <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">PMFreak</p>
          <h2 className="mt-3 text-xl font-semibold">Operational Command System</h2>
          <p className="mt-2 text-xs text-slate-400">{user.companyName}</p>

          <nav className="mt-6 space-y-2">
            {PM_MODULES.map((item) => (
              <Link
                key={item.href}
                href={navHref(item.href)}
                className={`block rounded-xl border px-4 py-3 transition ${
                  pathname.startsWith(item.href)
                    ? "border-cyan-300/50 bg-cyan-300/10"
                    : "border-transparent hover:border-cyan-300/40 hover:bg-cyan-300/10"
                }`}
              >
                <p className="text-sm font-medium text-slate-100">{item.label}</p>
                <p className="mt-1 text-xs text-slate-400">{item.description}</p>
              </Link>
            ))}
          </nav>

          <div className="mt-auto rounded-2xl border border-white/10 bg-black/20 p-4 text-xs text-slate-300">
            <p className="font-semibold text-white">{user.fullName}</p>
            <p>{user.role}</p>
            <Link href="/logout" className="mt-3 inline-block text-cyan-200">
              Logout
            </Link>
          </div>
        </aside>

        <div className="flex-1 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                Project Scope
              </span>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="rounded-lg border border-white/10 bg-black/30 px-3 py-1 text-sm"
              >
                <option value="">Portfolio scope</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <span className="text-xs text-slate-300">Current: {scopeLabel}</span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
              {OPERATIONAL_FLOW.map((step, idx) => (
                <span key={step}>
                  {step}
                  {idx < OPERATIONAL_FLOW.length - 1 ? " →" : ""}
                </span>
              ))}
            </div>
          </div>

          <main>{children}</main>
        </div>
      </div>
    </div>
  );
}
