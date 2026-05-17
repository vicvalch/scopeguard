import { MarketingNavbar } from "@/components/marketing-navbar";
import Link from "next/link";
import { HeroSection } from "@/components/landing/hero-section";

const failureMetrics = [
  { label: "Escalation delay", value: "48-96 hrs", detail: "How long critical issues can sit before the right decision maker sees them." },
  { label: "False green status", value: "37%", detail: "Programs that look healthy on paper while recovery work is already overdue." },
  { label: "PM burnout risk", value: "2.4x", detail: "Higher burnout exposure when project context lives in too many places." },
  { label: "Manual update chasing", value: "26%", detail: "Weekly PM time lost gathering and translating updates by hand." },
];

const capabilities = [
  ["Know what is about to go wrong", "PMFreak spots early warning signs in project updates, meetings, and delivery patterns before they become fire drills."],
  ["Know who needs attention", "See which stakeholders are getting tense, misaligned, or likely to escalate so you can step in early."],
  ["Get clearer next steps", "PMFreak turns messy project signals into practical actions with owner, timing, and expected impact."],
  ["Keep everyone working from the same reality", "Bring scattered notes, chats, and status updates into one view your team can trust."],
  ["Prepare better status updates", "Walk into weekly and executive reviews with the risks, decisions, and talking points already organized."],
  ["Never lose the thread", "PMFreak remembers decisions, blockers, risks, and commitments across your projects."],
] as const;

const howItWorks = [
  "Collect updates from your usual tools",
  "Connect decisions, risks, and owners automatically",
  "Highlight what needs attention first",
  "Generate talking points and next steps",
  "Keep a clean memory of what changed and why",
];

const comparisonRows = [
  ["Passive dashboards", "Clear next actions"],
  ["Reactive follow-up", "Early risk warning"],
  ["Status-only reporting", "Decision-ready updates"],
  ["Scattered project context", "Shared project memory"],
  ["Last-minute surprises", "Prepared meetings"],
] as const;

const trustPoints = [
  "Clear reasoning behind each suggestion",
  "Secure setup options for every team size",
  "Audit-ready history of risks, decisions, and actions",
  "Human review before important decisions",
  "Consistent support across projects and portfolios",
  "Evidence trail from update to action",
];

const buyers = ["Junior PM", "Senior PM", "Technical PM", "Non-Technical PM", "PMO Leader", "Delivery Manager", "Founder"];

const nextStepBenefits = [
  "Stop chasing updates manually",
  "Avoid surprises before meetings",
  "Get clearer next steps each week",
  "Keep stakeholders aligned as pressure rises",
  "Prepare status updates in less time",
  "Lead like a more senior PM",
];

const primaryCtaClass = "rounded-full bg-[#ff008c] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#db0078]";
const secondaryCtaClass = "rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/15";

export default function Home() {
  return (
    <>
      <MarketingNavbar />

      <main className="min-h-screen bg-white px-5 py-8 text-zinc-950 md:px-8 md:py-12">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-7">
          <HeroSection />

          <section id="why-pmfreak" className="rounded-3xl border border-zinc-200 bg-white p-7 shadow-sm md:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#ff008c]">Why PMFreak Exists</p>
            <h2 className="mt-3 text-3xl font-black text-zinc-950 md:text-4xl">Stop chasing updates. Start driving outcomes.</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <article className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                <h3 className="text-lg font-black text-zinc-950">What most PM teams deal with</h3>
                <ul className="mt-3 space-y-2 text-sm text-zinc-700">
                  <li>• Reports that describe the past, not what to do now</li>
                  <li>• Risks discovered late in the week</li>
                  <li>• Stakeholder shifts that are easy to miss</li>
                  <li>• Important decisions buried in messages and notes</li>
                </ul>
              </article>
              <article className="rounded-2xl border border-zinc-200 bg-zinc-950 p-5">
                <h3 className="text-lg font-black text-white">What PMFreak changes</h3>
                <ul className="mt-3 space-y-2 text-sm text-zinc-200">
                  <li>• Know what might go wrong before it becomes urgent</li>
                  <li>• Spot stakeholder tension early</li>
                  <li>• Remember every decision, risk, blocker, and commitment</li>
                  <li>• Walk into meetings with clear talking points and actions</li>
                </ul>
              </article>
            </div>
          </section>

          <section className="rounded-3xl border border-zinc-200 bg-white p-7 shadow-sm md:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#ff008c]">The Cost of Finding Out Too Late</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {failureMetrics.map((metric) => (
                <article key={metric.label} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">{metric.label}</p>
                  <p className="mt-2 text-3xl font-black text-zinc-950">{metric.value}</p>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-700">{metric.detail}</p>
                </article>
              ))}
            </div>
          </section>

          <section id="intelligence" className="rounded-3xl border border-zinc-200 bg-white p-7 shadow-sm md:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#ff008c]">How PMFreak helps day to day</p>
            <h2 className="mt-3 text-3xl font-black text-zinc-950 md:text-4xl">Practical support for every kind of PM.</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {capabilities.map(([title, text]) => (
                <article key={title} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                  <h3 className="text-lg font-black text-zinc-950">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-700">{text}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-zinc-200 bg-white p-7 shadow-sm md:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#ff008c]">How it works</p>
            <h2 className="mt-3 text-3xl font-black text-zinc-950 md:text-4xl">From scattered updates to confident action.</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-5">
              {howItWorks.map((item) => (
                <div key={item} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm font-semibold text-zinc-800">
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-zinc-200 bg-white p-7 shadow-sm md:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#ff008c]">PMFreak vs Traditional PM Tools</p>
            <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-200">
              <div className="grid grid-cols-2 bg-zinc-950 text-sm font-black uppercase tracking-[0.12em] text-white">
                <div className="border-r border-white/10 p-4">Traditional PM Tools</div>
                <div className="p-4">PMFreak</div>
              </div>
              {comparisonRows.map(([legacy, modern]) => (
                <div key={legacy} className="grid grid-cols-2 border-t border-zinc-200 text-sm">
                  <div className="border-r border-zinc-200 bg-zinc-50 p-4 text-zinc-600">{legacy}</div>
                  <div className="bg-white p-4 font-semibold text-zinc-950">{modern}</div>
                </div>
              ))}
            </div>
          </section>

          <section id="trust" className="rounded-3xl border border-zinc-200 bg-white p-7 shadow-sm md:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#ff008c]">Trust for teams and leadership</p>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {trustPoints.map((item) => (
                <div key={item} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm font-semibold text-zinc-800">
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section id="who-buys" className="rounded-3xl border border-zinc-200 bg-white p-7 shadow-sm md:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#ff008c]">Built for every PM role</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {buyers.map((buyer) => (
                <div key={buyer} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-base font-bold text-zinc-950">
                  {buyer}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-zinc-200 bg-zinc-950 p-7 shadow-[0_20px_80px_rgba(15,23,42,0.18)] md:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-200">What you can do next</p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {nextStepBenefits.map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm font-semibold text-zinc-100">
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className={primaryCtaClass}>
                Start Free
              </Link>
              <Link href="/demo" className={secondaryCtaClass}>
                Try Demo
              </Link>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
