"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type EventType =
  | "blocker_introduced"
  | "escalation_ignored"
  | "stakeholder_pressure"
  | "pm_overload"
  | "exec_intervention"
  | "dependency_resolved"
  | "recovery_activated";

type DemoEvent = {
  day: number;
  type: EventType;
  title: string;
  effect: {
    executionRisk: number;
    pressure: number;
    coordination: number;
    drift: number;
    recovery: number;
  };
};

const baseState = {
  executionRisk: 42,
  pressure: 38,
  coordination: 46,
  drift: 24,
  recovery: 6,
};

const timeline: DemoEvent[] = [
  {
    day: 1,
    type: "blocker_introduced",
    title: "Vendor API blocker introduced on reporting dependency.",
    effect: { executionRisk: 10, pressure: 2, coordination: -6, drift: 7, recovery: 0 },
  },
  {
    day: 2,
    type: "escalation_ignored",
    title: "Escalation ignored for 24h due to executive travel.",
    effect: { executionRisk: 8, pressure: 7, coordination: -4, drift: 8, recovery: 0 },
  },
  {
    day: 3,
    type: "stakeholder_pressure",
    title: "CFO requests launch certainty; pressure rises across leadership.",
    effect: { executionRisk: 5, pressure: 15, coordination: -2, drift: 6, recovery: 0 },
  },
  {
    day: 4,
    type: "pm_overload",
    title: "Primary PM overloaded with 17 unresolved action items.",
    effect: { executionRisk: 7, pressure: 6, coordination: -7, drift: 6, recovery: 0 },
  },
  {
    day: 5,
    type: "exec_intervention",
    title: "Executive intervention triggered with explicit owner reassignment.",
    effect: { executionRisk: -8, pressure: -4, coordination: 10, drift: -6, recovery: 12 },
  },
  {
    day: 6,
    type: "dependency_resolved",
    title: "Critical dependency deadlock resolved by architecture lead.",
    effect: { executionRisk: -9, pressure: -4, coordination: 12, drift: -8, recovery: 16 },
  },
  {
    day: 7,
    type: "recovery_activated",
    title: "Delivery recovery sequence activated with daily war-room cadence.",
    effect: { executionRisk: -12, pressure: -7, coordination: 14, drift: -9, recovery: 18 },
  },
];

const commentaryLibrary: Record<EventType, string> = {
  blocker_introduced: "Delivery instability spreading across coordination chain.",
  escalation_ignored: "Operational silence after escalation is increasing executive risk.",
  stakeholder_pressure: "Stakeholder volatility is amplifying escalation chain instability.",
  pm_overload: "PM overload is degrading follow-through and increasing delivery drift.",
  exec_intervention: "Intervention engine recommends immediate owner realignment and cadence reset.",
  dependency_resolved: "Recovery sequence partially successful after dependency unblocking.",
  recovery_activated: "Stakeholder volatility stabilized after intervention.",
};

function clamp(n: number) {
  return Math.max(0, Math.min(100, n));
}

export function InteractiveDemoExperience() {
  const [day, setDay] = useState(0);
  const [manualEvents, setManualEvents] = useState<DemoEvent[]>([]);

  const activeTimeline = useMemo(() => {
    const progressed = timeline.filter((event) => event.day <= day);
    return [...progressed, ...manualEvents].sort((a, b) => a.day - b.day);
  }, [day, manualEvents]);

  const intelligence = activeTimeline.reduce(
    (acc, event) => ({
      executionRisk: clamp(acc.executionRisk + event.effect.executionRisk),
      pressure: clamp(acc.pressure + event.effect.pressure),
      coordination: clamp(acc.coordination + event.effect.coordination),
      drift: clamp(acc.drift + event.effect.drift),
      recovery: clamp(acc.recovery + event.effect.recovery),
    }),
    baseState,
  );

  const latestCommentary = activeTimeline.length
    ? commentaryLibrary[activeTimeline[activeTimeline.length - 1].type]
    : "System baseline loaded. PMFreak is monitoring execution risk and stakeholder posture.";

  const addManualEvent = (type: EventType, title: string, effect: DemoEvent["effect"]) => {
    setManualEvents((prev) => [...prev, { day: Math.max(1, day), type, title, effect }]);
  };

  return (
    <main className="min-h-screen bg-[#0f0f15] px-5 py-8 text-white md:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl border border-pink-400/30 bg-gradient-to-br from-[#181822] to-[#0f0f15] p-6 shadow-[0_0_60px_rgba(236,72,153,0.15)]">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-pink-400">PMFreak interactive demo</p>
          <h1 className="mt-2 text-3xl font-black md:text-5xl">Operational command center simulation</h1>
          <p className="mt-4 max-w-3xl text-sm text-white/80 md:text-base">A deterministic operational environment for new users, PMOs, investors, and enterprise buyers to evaluate escalation intelligence, delivery resilience, and intervention quality in under three minutes.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button onClick={() => setDay((d) => Math.min(7, d + 1))} className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-bold">Advance 1 day</button>
            <button onClick={() => setDay((d) => Math.min(7, d + 3))} className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-bold">Advance 3 days</button>
            <button onClick={() => addManualEvent("escalation_ignored", "Manual escalation ignored by silent stakeholder.", { executionRisk: 6, pressure: 9, coordination: -3, drift: 5, recovery: 0 })} className="rounded-full border border-red-300/40 bg-red-400/20 px-4 py-2 text-sm font-bold">Trigger escalation</button>
            <button onClick={() => addManualEvent("blocker_introduced", "Manual blocker introduced in cross-team dependency.", { executionRisk: 8, pressure: 4, coordination: -6, drift: 8, recovery: 0 })} className="rounded-full border border-red-300/40 bg-red-400/20 px-4 py-2 text-sm font-bold">Simulate blocker</button>
            <button onClick={() => addManualEvent("dependency_resolved", "Dependency resolved through coordination orchestrator.", { executionRisk: -7, pressure: -3, coordination: 10, drift: -8, recovery: 12 })} className="rounded-full border border-emerald-300/40 bg-emerald-400/20 px-4 py-2 text-sm font-bold">Resolve dependency</button>
            <button onClick={() => addManualEvent("stakeholder_pressure", "Executive stakeholder volatility spike detected.", { executionRisk: 4, pressure: 12, coordination: -1, drift: 5, recovery: 0 })} className="rounded-full border border-amber-300/40 bg-amber-400/20 px-4 py-2 text-sm font-bold">Trigger stakeholder pressure</button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-5">
          {Object.entries(intelligence).map(([key, value]) => (
            <article key={key} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/60">{key.replace(/([A-Z])/g, " $1")}</p>
              <p className="mt-2 text-3xl font-black">{value}</p>
              <div className="mt-2 h-2 rounded-full bg-white/10"><div className="h-2 rounded-full bg-pink-400" style={{ width: `${value}%` }} /></div>
            </article>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-white/10 bg-[#14141e] p-5">
            <h2 className="text-xl font-black">Activity feed + escalation history</h2>
            <p className="mt-2 text-sm text-white/70">Current day: Day {day}. Every event re-runs execution risk, stakeholder intelligence, intervention engine, and coordination orchestration.</p>
            <ul className="mt-4 space-y-3 text-sm">
              {activeTimeline.length === 0 ? <li className="text-white/60">No incidents yet. Advance time to start deterministic timeline.</li> : activeTimeline.map((event, idx) => <li key={`${event.title}-${idx}`} className="rounded-xl border border-white/10 bg-white/5 p-3"><span className="font-bold text-pink-300">Day {event.day}:</span> {event.title}</li>)}
            </ul>
          </article>

          <article className="rounded-2xl border border-white/10 bg-[#14141e] p-5">
            <h2 className="text-xl font-black">PMFreak commentary + guided intelligence</h2>
            <p className="mt-3 rounded-xl border border-pink-300/30 bg-pink-400/10 p-3 text-sm">{latestCommentary}</p>
            <div className="mt-4 space-y-2 text-sm text-white/80">
              <p><strong>Detected:</strong> escalation chain instability, stakeholder silence, delivery drift spread, and coordination deadlocks.</p>
              <p><strong>Why it matters:</strong> unresolved pressure compounds execution risk and burns delivery confidence with executive buyers.</p>
              <p><strong>What PMFreak coordinates:</strong> owner reassignment, response cadence, dependency release, and recovery workstream sequencing.</p>
              <p><strong>Recommended intervention:</strong> trigger executive sync, assign backup PM, isolate critical path, and run a recovery war-room for 5 days.</p>
            </div>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <article className="rounded-2xl border border-white/10 bg-[#14141e] p-4"><h3 className="font-black">Delivery timeline</h3><p className="mt-2 text-sm text-white/70">Delayed delivery risk rises until executive intervention and dependency resolution events fire.</p></article>
          <article className="rounded-2xl border border-white/10 bg-[#14141e] p-4"><h3 className="font-black">Coordination map</h3><p className="mt-2 text-sm text-white/70">PM, engineering, architecture, and executive nodes rebalance during recovery sequence activation.</p></article>
          <article className="rounded-2xl border border-white/10 bg-[#14141e] p-4"><h3 className="font-black">Stakeholder map</h3><p className="mt-2 text-sm text-white/70">Unstable executive stakeholder and silent dependencies are surfaced with pressure and response posture shifts.</p></article>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-2xl font-black">Next step</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link className="rounded-full border border-white/30 px-4 py-2 font-bold" href="/signup">Create Workspace</Link>
            <Link className="rounded-full border border-white/30 px-4 py-2 font-bold" href="/signup">Start Free</Link>
            <Link className="rounded-full border border-white/30 px-4 py-2 font-bold" href="/pricing">Launch PMO</Link>
            <Link className="rounded-full border border-white/30 px-4 py-2 font-bold" href="/login">Import Real Project</Link>
          </div>
        </section>

        {/* Architecture notes for future: live enterprise simulations, AI war-room playback, incident replay systems, org-wide coordination playback, training/sandbox environments, autonomous operational rehearsal systems. */}
      </div>
    </main>
  );
}
