import { MarketingNavbar } from "@/components/marketing-navbar";
import Link from "next/link";

const painSignals = [
  "Execution chaos across cross-functional teams",
  "Stakeholder pressure surfacing too late",
  "Invisible escalations hidden in status updates",
  "PM overload concentrated on a few critical people",
  "Delivery instability that compounds week-over-week",
  "Organizational drift between strategy and delivery",
  "Reactive operations replacing deliberate intervention",
];

const failureMetrics = [
  { label: "Delayed escalations", value: "48-96 hrs", detail: "Average lag before critical issues reach decision makers." },
  { label: "Executive blind spots", value: "37%", detail: "Programs reporting green while recovery actions are already overdue." },
  { label: "PM burnout exposure", value: "2.4x", detail: "Higher risk in portfolios with unresolved coordination debt." },
  { label: "Recovery cost", value: "3.1x", detail: "Cost multiplier once intervention starts after delivery rupture." },
  { label: "Coordination drag", value: "26%", detail: "Weekly execution time lost to status chasing and translation." },
  { label: "Stakeholder instability", value: "+41%", detail: "Escalation volatility when communication confidence drops." },
  { label: "Delivery collapse risk", value: "18%", detail: "Portfolio segments entering multi-stream failure conditions." },
];

const capabilities = [
  ["Escalation Intelligence", "Detects early escalation signatures across meetings, updates, and delivery telemetry before issues become political."],
  ["Stakeholder Intelligence", "Maps confidence, pressure, and influence drift so intervention plans account for human execution dynamics."],
  ["Intervention Orchestration", "Creates sequence-based recovery plans with ownership, timing, and expected operational impact."],
  ["Coordination Infrastructure", "Converts fragmented team signals into one shared operational context for delivery leadership."],
  ["Recovery Systems", "Runs playbooks for stalled initiatives, unstable launches, and failing transformation tracks."],
  ["Executive Telemetry", "Provides live visibility into execution stability, not just milestone completion."],
  ["Operational Replay", "Reconstructs failure timelines so leaders can understand what broke, when, and why."],
  ["Portfolio Instability Detection", "Identifies systemic risk propagation across programs before it cascades."],
] as const;

const buyers = [
  "CIO",
  "COO",
  "PMO Director",
  "Enterprise Transformation Lead",
  "Delivery Executive",
  "Crisis Recovery Teams",
];

const comparisonRows = [
  ["Passive dashboards", "Operational orchestration"],
  ["Reactive PM effort", "Escalation awareness"],
  ["Static reporting", "Intervention intelligence"],
  ["Fragmented coordination", "Execution recovery systems"],
  ["Invisible pressure", "Live operational visibility"],
] as const;

export default function Home() {
  return (
    <>
      <MarketingNavbar />

      <main className="min-h-screen bg-[#07080b] px-5 py-8 text-[#e7e9ee] md:px-8 md:py-12">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-7">
          <section className="relative overflow-hidden rounded-3xl border border-[#262a33] bg-[radial-gradient(circle_at_top_left,#1b2030_0%,#0b0d13_45%,#07080b_100%)] p-7 shadow-[0_30px_100px_rgba(0,0,0,0.55)] md:p-12">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#8ca2ff]">Operational Intelligence System for Enterprise Execution</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight text-white md:text-6xl">
              When execution starts failing, PMFreak becomes your operational command infrastructure.
            </h1>
            <p className="mt-6 max-w-3xl text-base font-medium leading-relaxed text-[#c5c9d3] md:text-lg">
              Enterprises do not fail from missing dashboards. They fail when escalation is late, ownership is unclear, and recovery is uncoordinated. PMFreak detects pressure, orchestrates intervention, and stabilizes delivery before drift becomes collapse.
            </p>

            <div className="mt-8 grid gap-3 md:grid-cols-2">
              {painSignals.map((pain) => (
                <div key={pain} className="rounded-2xl border border-[#313748] bg-[#0e1119]/90 p-4 text-sm font-semibold text-[#d8dced]">
                  {pain}
                </div>
              ))}
            </div>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/signup" className="rounded-full border border-[#93a6ff] bg-[#7d90ff] px-6 py-3 text-sm font-bold text-[#06070a] transition hover:bg-[#95a6ff]">
                Book Executive Demo
              </Link>
              <Link href="/demo" className="rounded-full border border-[#3b4358] bg-[#121623] px-6 py-3 text-sm font-bold text-[#dde3ff] transition hover:border-[#6273a8]">
                Simulate Operational Collapse
              </Link>
              <Link href="/interactive-demo" className="rounded-full border border-[#3b4358] bg-[#121623] px-6 py-3 text-sm font-bold text-[#dde3ff] transition hover:border-[#6273a8]">
                See PMFreak Recover a Failing Program
              </Link>
            </div>
          </section>

          <section id="why-pmfreak" className="rounded-3xl border border-[#262a33] bg-[#0b0d13] p-7 md:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#8ca2ff]">Why PMFreak Exists</p>
            <h2 className="mt-3 text-3xl font-black text-white md:text-4xl">Dashboards report. PMFreak coordinates recovery.</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <article className="rounded-2xl border border-[#2c3140] bg-[#0f121b] p-5">
                <h3 className="text-lg font-black text-white">What enterprises already have</h3>
                <ul className="mt-3 space-y-2 text-sm text-[#c4cad8]">
                  <li>• Dashboard visibility without intervention logic</li>
                  <li>• Status reporting without escalation understanding</li>
                  <li>• KPI snapshots without pressure detection</li>
                  <li>• Portfolio views without coordinated recovery motion</li>
                </ul>
              </article>
              <article className="rounded-2xl border border-[#3a4562] bg-[#111828] p-5">
                <h3 className="text-lg font-black text-white">What PMFreak changes</h3>
                <ul className="mt-3 space-y-2 text-sm text-[#d6ddf3]">
                  <li>• Detects escalation before reporting cycles catch up</li>
                  <li>• Understands stakeholder pressure and confidence shifts</li>
                  <li>• Orchestrates intervention across teams and decision layers</li>
                  <li>• Coordinates recovery actions until execution stabilizes</li>
                </ul>
              </article>
            </div>
          </section>

          <section className="rounded-3xl border border-[#262a33] bg-[#0b0d13] p-7 md:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#8ca2ff]">The Cost of Invisible Execution Failure</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {failureMetrics.map((metric) => (
                <article key={metric.label} className="rounded-2xl border border-[#2f3546] bg-[#10131d] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9ea9cf]">{metric.label}</p>
                  <p className="mt-2 text-3xl font-black text-white">{metric.value}</p>
                  <p className="mt-2 text-xs leading-relaxed text-[#bbc2d7]">{metric.detail}</p>
                </article>
              ))}
            </div>
          </section>

          <section id="intelligence" className="rounded-3xl border border-[#262a33] bg-[#0b0d13] p-7 md:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#8ca2ff]">Enterprise Capability Layer</p>
            <h2 className="mt-3 text-3xl font-black text-white md:text-4xl">Operational intelligence built for high-pressure execution systems.</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {capabilities.map(([title, text]) => (
                <article key={title} className="rounded-2xl border border-[#2f3546] bg-[#10131d] p-5">
                  <h3 className="text-lg font-black text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#c2c8da]">{text}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-[#262a33] bg-[#0b0d13] p-7 md:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#8ca2ff]">Explainable AI</p>
            <h2 className="mt-3 text-3xl font-black text-white md:text-4xl">Enterprise trust requires deterministic operational reasoning.</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-5">
              {[
                "Deterministic outputs",
                "Source signal attribution",
                "Intervention rationale",
                "Confidence indications",
                "Operational auditability",
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-[#2f3546] bg-[#10131d] p-4 text-sm font-semibold text-[#d3daf0]">
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-[#262a33] bg-[#0b0d13] p-7 md:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#8ca2ff]">PMFreak vs Traditional PM Tools</p>
            <div className="mt-5 overflow-hidden rounded-2xl border border-[#2f3546]">
              <div className="grid grid-cols-2 bg-[#131827] text-sm font-black uppercase tracking-[0.12em] text-[#dbe2ff]">
                <div className="border-r border-[#2f3546] p-4">Traditional PM Tools</div>
                <div className="p-4">PMFreak</div>
              </div>
              {comparisonRows.map(([legacy, modern]) => (
                <div key={legacy} className="grid grid-cols-2 border-t border-[#2f3546] text-sm">
                  <div className="border-r border-[#2f3546] bg-[#0f121c] p-4 text-[#b6bdd2]">{legacy}</div>
                  <div className="bg-[#101624] p-4 font-semibold text-[#dce3ff]">{modern}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-[#262a33] bg-[#0b0d13] p-7 md:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#8ca2ff]">Architecture Visualization</p>
            <h2 className="mt-3 text-3xl font-black text-white md:text-4xl">Execution intelligence architecture</h2>
            <div className="mt-6 grid gap-3 md:grid-cols-5">
              {["Telemetry Ingestion", "Orchestration Engine", "Intervention Engine", "Coordination Intelligence", "Executive Visibility Layer"].map((layer, index) => (
                <div key={layer} className="rounded-2xl border border-[#2f3546] bg-[#10131d] p-4 text-center">
                  <p className="text-xs font-bold text-[#8ca2ff]">Layer {index + 1}</p>
                  <p className="mt-2 text-sm font-semibold text-[#dce2f5]">{layer}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="trust" className="rounded-3xl border border-[#262a33] bg-[#0b0d13] p-7 md:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#8ca2ff]">Enterprise Trust Layer</p>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {[
                "Governance direction for enterprise operating models",
                "Deterministic reasoning for operational decisions",
                "Secure deployment direction aligned to enterprise controls",
                "Auditable intervention timelines and recovery paths",
                "Human-in-the-loop orchestration at every critical step",
                "Explainability from signal to action",
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-[#2f3546] bg-[#10131d] p-4 text-sm font-semibold text-[#ced4e8]">
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section id="who-buys" className="rounded-3xl border border-[#262a33] bg-[#0b0d13] p-7 md:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#8ca2ff]">Who Buys PMFreak</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {buyers.map((buyer) => (
                <div key={buyer} className="rounded-2xl border border-[#2f3546] bg-[#10131d] p-4 text-base font-bold text-white">
                  {buyer}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-[#2c3350] bg-[linear-gradient(120deg,#141b2f_0%,#0e1220_55%,#0a0d16_100%)] p-7 shadow-[0_20px_80px_rgba(0,0,0,0.45)] md:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#8ca2ff]">Enterprise Roadmap</p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {["Slack/Teams ingestion", "Jira integration", "Autonomous PM agents", "Org-wide execution graphs", "Portfolio coordination", "AI execution infrastructure"].map((item) => (
                <div key={item} className="rounded-2xl border border-[#3a435f] bg-[#10162a] p-4 text-sm font-semibold text-[#dce3ff]">
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className="rounded-full border border-[#a2b3ff] bg-[#8da0ff] px-6 py-3 text-sm font-bold text-[#05070c] transition hover:bg-[#9daeff]">
                Explore Enterprise Execution Intelligence
              </Link>
              <Link href="/demo" className="rounded-full border border-[#3b4358] bg-[#121623] px-6 py-3 text-sm font-bold text-[#dde3ff] transition hover:border-[#6273a8]">
                Book Executive Demo
              </Link>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
