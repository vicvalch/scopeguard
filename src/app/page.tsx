import type { Metadata } from "next";
import Link from "next/link";

import { HeroSection } from "@/components/landing/hero-section";
import { MarketingNavbar } from "@/components/marketing-navbar";

type FooterLink =
  | { label: string; href: string }
  | { label: string; disabled: true };

type FooterColumn = {
  heading: string;
  links: readonly FooterLink[];
};

export const metadata: Metadata = {
  description: "Operational cognition infrastructure for modern project delivery.",
};

const operationalRealities = [
  {
    title: "Escalations surface too late",
    description:
      "Critical issues often sit across chats, docs, and meetings before reaching decision makers.",
  },
  {
    title: "Status can look green while recovery work is already overdue",
    description:
      "Teams often discover delivery problems only after momentum has already been lost.",
  },
  {
    title: "Context fragmentation burns PM time",
    description:
      "Project managers spend hours reconstructing what changed, who owns what, and what needs action.",
  },
  {
    title: "Leadership gets decision-ready context too late",
    description:
      "Scattered updates make it difficult to walk into meetings with clear operational awareness.",
  },
] as const;

const operationalFlow = [
  {
    step: "Capture",
    text: "Collect operational signals from meetings, updates, chats, and delivery activity.",
  },
  {
    step: "Classify",
    text: "Connect risks, decisions, blockers, stakeholders, and ownership automatically.",
  },
  {
    step: "Synthesize",
    text: "Transform fragmented updates into operational awareness.",
  },
  {
    step: "Remember",
    text: "Build a persistent organizational memory across projects and teams.",
  },
  {
    step: "Act",
    text: "Walk into meetings with clearer priorities, actions, and escalation awareness.",
  },
] as const;

const governanceCards = [
  {
    title: "Controlled AI workspace",
    description: "Keep operational reasoning inside structured project boundaries.",
  },
  {
    title: "Audit-ready operational history",
    description: "Track risks, decisions, blockers, and actions with persistent context.",
  },
  {
    title: "Enterprise isolation",
    description:
      "Separate organizational intelligence from public AI conversations and fragmented tooling.",
  },
  {
    title: "Operational memory",
    description:
      "Build a reusable institutional memory instead of losing delivery knowledge over time.",
  },
] as const;

const comparisonRows = [
  ["Passive dashboards", "Clear next actions"],
  ["Reactive follow-up", "Early risk warning"],
  ["Status-only reporting", "Decision-ready updates"],
  ["Scattered project context", "Shared project memory"],
  ["Last-minute surprises", "Prepared meetings"],
] as const;

const footerColumns = [
  {
    heading: "Product",
    links: [
      { label: "How it Works", href: "#how-it-works" },
      { label: "Security", href: "#security" },
      { label: "Pricing", href: "/pricing" },
      { label: "Demo", href: "/demo" },
    ],
  },
  {
    heading: "Use Cases",
    links: [
      { label: "PMOs", disabled: true },
      { label: "Delivery Teams", disabled: true },
      { label: "Technical PMs", disabled: true },
      { label: "Consulting Teams", disabled: true },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", disabled: true },
      { label: "Contact", disabled: true },
      { label: "Roadmap", disabled: true },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy Policy", disabled: true },
      { label: "Terms of Service", disabled: true },
      { label: "Security", href: "#security" },
    ],
  },
] as const satisfies readonly FooterColumn[];

const primaryCtaClass =
  "rounded-full bg-[#ff008c] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#db0078]";

const secondaryCtaClass =
  "rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/15";

const lightSectionClass = "rounded-3xl border border-zinc-200 bg-white shadow-sm";

function OperationalRealitySection() {
  return (
    <section className={`${lightSectionClass} p-7 md:p-9`}>
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#ff008c]">
        <span id="intelligence" className="block relative -top-24"></span>Operational reality
      </p>

      <h2 className="mt-3 text-3xl font-black text-zinc-950 md:text-4xl">
        The hidden cost of scattered project intelligence
      </h2>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {operationalRealities.map((item) => (
          <article
            key={item.title}
            className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5"
          >
            <h3 className="text-base font-black text-zinc-950 md:text-lg">
              {item.title}
            </h3>

            <p className="mt-2 text-sm leading-relaxed text-zinc-700">
              {item.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function OperationalFlowSection() {
  return (
    <section id="how-it-works" className={`${lightSectionClass} p-7 md:p-9`}>
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#ff008c]">
        How it works
      </p>

      <h2 className="mt-3 text-3xl font-black text-zinc-950 md:text-4xl">
        From scattered updates to operational clarity.
      </h2>

      <div className="mt-6 grid gap-3 md:grid-cols-5">
        {operationalFlow.map((item, index) => (
          <article
            key={item.step}
            className="rounded-2xl border border-zinc-200 bg-white p-4"
          >
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-700">
              {String(index + 1).padStart(2, "0")}
            </p>

            <h3 className="mt-2 text-base font-black text-zinc-950">
              {item.step}
            </h3>

            <p className="mt-2 text-sm leading-relaxed text-zinc-700">
              {item.text}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function GovernanceSection() {
  return (
    <section
      id="security"
      className="rounded-3xl border border-zinc-800 bg-zinc-950 p-7 shadow-[0_24px_90px_rgba(15,23,42,0.24)] md:p-9"
    >
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-200">
        Governance and control
      </p>

      <h2 className="mt-3 text-3xl font-black text-white md:text-4xl">
        Built for controlled operational intelligence.
      </h2>

      <p className="mt-3 max-w-4xl text-sm leading-relaxed text-zinc-300 md:text-base">
        PMFreak helps teams operationalize AI safely instead of scattering
        sensitive project intelligence across disconnected tools.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {governanceCards.map((item) => (
          <article
            key={item.title}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
          >
            <h3 className="text-lg font-black text-white">{item.title}</h3>

            <p className="mt-2 text-sm leading-relaxed text-zinc-300">
              {item.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function ComparisonSection() {
  return (
    <section className={`${lightSectionClass} p-6 md:p-8`}>
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#ff008c]">
        PMFreak vs Traditional PM Tools
      </p>

      <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200">
        <div className="grid grid-cols-2 bg-zinc-950 text-xs font-black uppercase tracking-[0.12em] text-white md:text-sm">
          <div className="border-r border-white/10 p-3 md:p-4">
            Traditional PM Tools
          </div>

          <div className="p-3 md:p-4">PMFreak</div>
        </div>

        {comparisonRows.map(([legacy, modern]) => (
          <div
            key={legacy}
            className="grid grid-cols-2 border-t border-zinc-200 text-sm"
          >
            <div className="border-r border-zinc-200 bg-zinc-50 p-3 text-zinc-600 md:p-4">
              {legacy}
            </div>

            <div className="bg-white p-3 font-semibold text-zinc-950 md:p-4">
              {modern}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FinalCtaSection() {
  return (
    <section className="rounded-3xl border border-zinc-200 bg-zinc-950 p-7 shadow-[0_20px_80px_rgba(15,23,42,0.18)] md:p-10">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-200">
        Get started
      </p>

      <h2 className="mt-3 text-3xl font-black text-white md:text-4xl">
        Build operational memory before problems become escalations.
      </h2>

      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-300 md:text-base">
        PMFreak helps teams turn scattered operational activity into structured
        awareness, clearer action, and reusable organizational intelligence.
      </p>

      <div className="mt-7 flex flex-wrap gap-3">
        <Link href="/signup" className={primaryCtaClass}>
          Start Free
        </Link>

        <Link href="/demo" className={secondaryCtaClass}>
          Try Demo
        </Link>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="rounded-3xl border border-zinc-800 bg-zinc-950 px-7 py-8 text-zinc-300 md:px-9">
      <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
        {footerColumns.map((column) => (
          <div key={column.heading}>
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white">
              {column.heading}
            </h3>

            <ul className="mt-4 space-y-2.5 text-sm">
              {column.links.map((link) => (
                <li key={link.label}>
                  {"disabled" in link ? (
                    <span className="cursor-default text-zinc-500">
                      {link.label}
                    </span>
                  ) : (
                    <Link
                      href={link.href}
                      className="transition hover:text-cyan-200"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-10 border-t border-white/10 pt-6">
        <p className="text-sm font-semibold text-white">PMFreak</p>

        <p className="mt-1 text-xs text-zinc-400">
          Operational cognition infrastructure for modern project delivery.
        </p>

        <p className="mt-3 text-xs text-zinc-500">
          © {new Date().getFullYear()} PMFreak. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <>
      <MarketingNavbar />

      <main className="min-h-screen bg-white px-5 py-8 text-zinc-950 md:px-8 md:py-12">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
          <HeroSection />

          <OperationalRealitySection />

          <OperationalFlowSection />

          <GovernanceSection />

          <ComparisonSection />

          <FinalCtaSection />

          <LandingFooter />
        </div>
      </main>
    </>
  );
}
