"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { OperationalEventFeed } from "./OperationalEventFeed";
import { ShellMetric } from "./ShellMetric";
import { AdvancedDrawer } from "./navigation/advanced-drawer";
import { DERIVED_LENS_METADATA } from "@/lib/workspace/derived-lens-metadata";
import { computeCapabilityRevealState, computeNavigationRail } from "@/features/runtime/capability-reveal/capability-reveal-selectors";
import {
  AWAKENING_EVENT,
  deriveAwakeningState,
  isLensUnlocked,
  loadAwakeningState,
  type AwakeningState,
} from "@/lib/workspace/awakening-state";
import { computeImprintConfidence } from "@/lib/workspace/imprint-confidence";
import { loadImprintState } from "@/lib/workspace/operational-imprint-profile";
import type { PMOperationalImprint } from "@/lib/workspace/operational-imprint-profile";

type UserProject = { id: string; name: string };

type OperationalShellProps = {
  children: React.ReactNode;
  user: { fullName: string; role: string; companyName: string };
};


export function OperationalShell({ children, user }: OperationalShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [awakening, setAwakening] = useState<AwakeningState>(() => deriveAwakeningState(0));
  const [imprintFocus, setImprintFocus] = useState<PMOperationalImprint["dominantFocus"] | null>(null);
  const [projects, setProjects] = useState<UserProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const initializedRef = useRef(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    const fromQuery = new URLSearchParams(window.location.search).get("projectId") ?? "";
    const fromStorage = window.localStorage.getItem("pmfreak.currentProjectId") ?? "";
    return fromQuery || fromStorage;
  });

  useEffect(() => {
    let active = true;
    async function load() {
      setProjectsLoading(true);
      setProjectsError(null);
      try {
        const res = await fetch("/api/projects", { cache: "no-store" });
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { projects?: UserProject[] };
        if (active) setProjects(data.projects ?? []);
      } catch {
        if (active) {
          setProjects([]);
          setProjectsError("Project list unavailable — continue in portfolio scope.");
        }
      } finally {
        if (active) setProjectsLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (projectId) globalThis.localStorage?.setItem("pmfreak.currentProjectId", projectId);
  }, [projectId]);

  // Hydrate awakening state from localStorage and keep in sync with workspace events
  useEffect(() => {
    setAwakening(loadAwakeningState("global", "default"));
    const imprintState = loadImprintState("global", "default", "default");
    const confidence = computeImprintConfidence(imprintState.profile);
    if (confidence !== "forming") {
      setImprintFocus(imprintState.profile.dominantFocus);
    }
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<AwakeningState>).detail;
      if (detail) setAwakening(detail);
    };
    window.addEventListener(AWAKENING_EVENT, handler);
    return () => window.removeEventListener(AWAKENING_EVENT, handler);
  }, []);

  // Once projects finish loading: clean stale localStorage and hydrate URL from stored id.
  // Skip on network error — a failed fetch must not incorrectly invalidate a valid stored context.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (projectsLoading || initializedRef.current) return;
    if (projectsError) return;
    initializedRef.current = true;

    const urlParams = new URLSearchParams(window.location.search);
    const urlProjectId = urlParams.get("projectId");
    const validIds = new Set(projects.map((p) => p.id));

    if (urlProjectId) {
      // Explicit URL projectId — validate but do not redirect (guarded state for invalid urls).
      if (!validIds.has(urlProjectId)) {
        globalThis.localStorage?.removeItem("pmfreak.currentProjectId");
        setProjectId("");
      }
      return;
    }

    // No projectId in URL — check stored id.
    if (projectId && validIds.has(projectId)) {
      // Valid stored id — hydrate URL to eliminate server/client drift.
      urlParams.set("projectId", projectId);
      router.replace(`${window.location.pathname}?${urlParams.toString()}`);
    } else if (projectId && !validIds.has(projectId)) {
      // Stale stored id — clean up without redirecting.
      globalThis.localStorage?.removeItem("pmfreak.currentProjectId");
      setProjectId("");
    }
  }, [projectsLoading]);

  const hasProjects = projects.length > 0;
  const revealState = useMemo(() => computeCapabilityRevealState({
    planTier: "free",
    role: user.role,
    onboardingCompleted: true,
    hasProject: hasProjects,
    firstRun: false,
    evidenceSignals: hasProjects ? 2 : 0,
    operationalMemorySignals: hasProjects ? 1 : 0,
    continuitySignals: hasProjects ? 1 : 0,
    canUseAdvancedAi: true,
    canUsePortfolioMemory: true,
    canUseGovernanceDirectives: user.role === "admin" || user.role === "owner",
  }), [hasProjects, user.role]);
  const scopeLabel = useMemo(
    () => projects.find((p) => p.id === projectId)?.name ?? "Portfolio scope",
    [projectId, projects]
  );
  const navHref = (href: string) => (projectId ? `${href}?projectId=${projectId}` : href);
  const navItems = computeNavigationRail(revealState);
  const primaryNav = navItems.filter((item) => item.href === "/workspace");
  const LENS_ORDER_BY_FOCUS: Record<PMOperationalImprint["dominantFocus"], string[]> = {
    delivery: ["/dashboard", "/command-center", "/executive", "/portfolio"],
    stakeholders: ["/dashboard", "/executive", "/command-center", "/portfolio"],
    governance: ["/dashboard", "/executive", "/command-center", "/portfolio"],
    risk: ["/dashboard", "/executive", "/command-center", "/portfolio"],
  };
  const lensHrefs = ["/dashboard", "/command-center", "/executive", "/portfolio"];
  const lensOrder = imprintFocus ? LENS_ORDER_BY_FOCUS[imprintFocus] : lensHrefs;
  const lensNav = navItems
    .filter((item) => lensHrefs.includes(item.href))
    .sort((a, b) => lensOrder.indexOf(a.href) - lensOrder.indexOf(b.href));
  const utilityNav = navItems.filter((item) => ["/projects", "/input-hub", "/team"].includes(item.href));
  const advancedNav = navItems.filter((item) => ![...primaryNav, ...lensNav, ...utilityNav].some((base) => base.href === item.href));
  const activeLens = DERIVED_LENS_METADATA.find((lens) => pathname.startsWith(lens.route) && ["summary", "execution", "executive", "portfolio"].includes(lens.lensType));

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <div className="mx-auto flex w-full max-w-[1540px] gap-4 px-3 py-4 md:gap-6 md:px-5 md:py-6">

        {/* ── Left rail ── */}
        <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-[15.5rem] flex-col rounded-3xl border border-white/[0.08] bg-slate-950/80 shadow-[0_36px_80px_-55px_rgba(14,116,144,0.4)] backdrop-blur-xl lg:flex overflow-hidden">

          {/* Scrollable interior */}
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

            {/* Identity block */}
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-black/40 p-3.5">
              {/* AI glow orb */}
              <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-indigo-500/20 blur-2xl motion-safe:animate-[breathe_8s_ease-in-out_infinite]" />
              <div className="pointer-events-none absolute -bottom-4 -left-4 h-16 w-16 rounded-full bg-cyan-500/15 blur-xl" />

              <div className="relative">
                <div className="flex items-center gap-2">
                  {/* AI pulse dot */}
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-indigo-400/60 motion-safe:animate-[pulse_3s_ease-in-out_infinite]" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-400" />
                  </span>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.36em] text-indigo-200/80">PMFreak</p>
                </div>

                <h2 className="mt-2 text-sm font-semibold leading-snug text-white">
                  {hasProjects ? "Operational Intelligence" : "Setup Your Context"}
                </h2>
                <p className="mt-0.5 text-[11px] text-zinc-500">{user.companyName}</p>
                <p className="mt-1 text-[10px] text-cyan-300/80">Stage: {revealState.stage} · Evidence: {revealState.evidenceDensity}</p>

                <div className="mt-2.5">
                  {hasProjects ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/30 bg-emerald-300/[0.08] px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-emerald-100">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 motion-safe:animate-pulse" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-500/30 bg-zinc-500/[0.08] px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-zinc-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
                      Standby
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Primary navigation */}
            <nav aria-label="Primary navigation" className="space-y-3">
              <div className="space-y-1">
                <p className="mb-1.5 px-1 text-[9px] uppercase tracking-[0.3em] text-zinc-600">Workspace</p>
              {primaryNav.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={navHref(item.href)}
                    className={`group relative block overflow-hidden rounded-xl border px-3 py-2.5 text-sm transition-all duration-200 ${
                      isActive
                        ? `${item.active} border-opacity-100`
                        : `border-white/[0.05] bg-white/[0.01] ${item.idle} hover:border-white/[0.15] hover:bg-white/[0.04] hover:-translate-y-px`
                    }`}
                  >
                    <span className={`pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 bg-gradient-to-r group-hover:opacity-100 ${item.accent}`} />
                    <span className="relative">{item.label}</span>
                  </Link>
                );
              })}
              </div>
              <div className="space-y-1">
                <p className="px-1 text-[9px] uppercase tracking-[0.3em] text-zinc-700">Lenses</p>
                {lensNav.map((item) => {
                  const unlocked = isLensUnlocked(item.href, awakening.stage);
                  return unlocked ? (
                    <Link key={item.href} href={navHref(item.href)} className={`block rounded-lg border px-3 py-2 text-xs ${pathname.startsWith(item.href) ? item.active : `border-white/[0.05] bg-white/[0.01] ${item.idle}`}`}>{item.label}</Link>
                  ) : (
                    <span key={item.href} className="block cursor-default rounded-lg border border-white/[0.03] px-3 py-2 text-xs text-zinc-700 opacity-40 select-none">{item.label}</span>
                  );
                })}
              </div>
              <div className="space-y-1">
                <p className="px-1 text-[9px] uppercase tracking-[0.3em] text-zinc-700">Utilities</p>
                {utilityNav.map((item) => (
                  <Link key={item.href} href={navHref(item.href)} className={`block rounded-lg border px-3 py-2 text-xs ${pathname.startsWith(item.href) ? item.active : `border-white/[0.05] bg-white/[0.01] ${item.idle}`}`}>{item.label}</Link>
                ))}
              </div>
              <AdvancedDrawer items={advancedNav} pathname={pathname} navHref={navHref} />
            </nav>

            {/* AI Assistant */}
            <div className="rounded-2xl border border-indigo-300/[0.12] bg-indigo-300/[0.04] p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-indigo-400/50 motion-safe:animate-[pulse_3s_ease-in-out_infinite]" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-indigo-400" />
                </span>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-indigo-300/80">AI Assistant</p>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-400">
                {hasProjects
                  ? "Monitoring"
                  : "No active context"}
              </p>
              <Link
                href="/workspace"
                className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-indigo-300/25 bg-indigo-300/[0.06] px-3 py-1.5 text-[11px] font-medium text-indigo-200 transition-all hover:border-indigo-300/40 hover:bg-indigo-300/[0.10]"
              >
                Open Workspace
                <span className="opacity-60">→</span>
              </Link>
            </div>

            {/* Operational signal feed */}
            {hasProjects && (
              <div>
                <p className="mb-1.5 px-1 text-[9px] uppercase tracking-[0.3em] text-zinc-700">Live Signals</p>
                <OperationalEventFeed maxVisible={3} />
              </div>
            )}

            {/* Empty state — no projects */}
            {!hasProjects && !projectsLoading && (
              <div className="rounded-2xl border border-cyan-300/[0.12] bg-cyan-300/[0.04] p-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-400/70 mb-1.5">Get Started</p>
                <p className="text-[11px] leading-relaxed text-slate-400">
                  Create your first context.
                </p>
                <Link
                  href="/workspace"
                  className="mt-2 inline-flex text-[11px] font-medium text-cyan-300 underline underline-offset-2 hover:text-cyan-200"
                >
                  Begin continuity →
                </Link>
              </div>
            )}

            {/* Context awareness metrics */}
            {hasProjects && (
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                <p className="mb-2.5 text-[9px] uppercase tracking-[0.28em] text-zinc-700">Workspace</p>
                <div className="grid grid-cols-2 gap-2.5">
                  <ShellMetric
                    label="Projects"
                    value={String(projects.length)}
                    delta="Active contexts"
                    trend="stable"
                  />
                  <ShellMetric
                    label="Signal drift"
                    value="+12%"
                    delta="vs. last week"
                    trend="warning"
                  />
                  <ShellMetric
                    label="Tension"
                    value="Rising"
                    delta="Political layer"
                    trend="down"
                  />
                  <ShellMetric
                    label="Memory"
                    value="Stable"
                    delta="Confidence OK"
                    trend="up"
                  />
                </div>
              </div>
            )}
          </div>

          {/* User block — pinned bottom */}
          <div className="shrink-0 border-t border-white/[0.07] px-3.5 py-3">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-200">{user.fullName}</p>
                <p className="truncate text-[10px] text-zinc-600">{user.role}</p>
              </div>
              <Link
                href="/logout"
                className="shrink-0 rounded-lg border border-white/[0.08] px-2.5 py-1.5 text-[10px] uppercase tracking-[0.12em] text-zinc-600 transition-colors hover:border-white/20 hover:text-slate-300"
              >
                Sign out
              </Link>
            </div>
          </div>
        </aside>

        {/* ── Main content region ── */}
        <div className="flex min-w-0 flex-1 flex-col gap-4 md:gap-5">

          {/* Mobile nav strip */}
          <div className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-3 backdrop-blur-xl lg:hidden">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-indigo-400/50 motion-safe:animate-[pulse_3s_ease-in-out_infinite]" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-indigo-400" />
                </span>
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-indigo-300/80">PMFreak</p>
              </div>
              <span className="text-[10px] text-zinc-600">{user.companyName}</span>
            </div>
            <div className="flex snap-x gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {[...primaryNav, ...lensNav, ...utilityNav].map((item) => (
                <Link
                  key={item.href}
                  href={navHref(item.href)}
                  className={`shrink-0 snap-start rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                    pathname.startsWith(item.href)
                      ? "border-cyan-200/30 bg-cyan-300/[0.08] text-cyan-100"
                      : "border-white/[0.08] bg-white/[0.02] text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Page content */}
          {activeLens && (
            <p className="px-1 text-[11px] text-slate-500">Workspace / {activeLens.breadcrumbLabel}</p>
          )}
          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
