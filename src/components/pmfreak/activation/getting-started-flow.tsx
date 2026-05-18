"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type DomainTemplate = {
  domain: string;
  title: string;
  text: string;
  why: string;
  critical: string;
};

type StorageStrategy = "cloud" | "local" | "self_hosted";
type StepId = 1 | 2 | 3 | 4 | 5;

type StorageOption = {
  id: StorageStrategy;
  title: string;
  description: string;
  note?: string;
  badge?: string;
};

type OnboardingForm = {
  companyName: string;
  pmoMaturity: string;
  industry: string;
  deliveryModel: string;
  teamSize: string;
  activeProjects: string;
  projectName: string;
  sponsor: string;
  pm: string;
  timeline: string;
  deliveryConfidence: string;
  projectType: string;
  storageStrategy: StorageStrategy;
};

const onboardingSteps: Array<{ id: StepId; title: string; subtitle: string }> = [
  { id: 1, title: "Company Context", subtitle: "Project baseline" },
  { id: 2, title: "Project Context", subtitle: "Execution frame" },
  { id: 3, title: "Project Workspace", subtitle: "Trust and governance" },
  { id: 4, title: "Intelligence Templates", subtitle: "Signal readiness" },
  { id: 5, title: "Activation Review", subtitle: "Final validation" },
];

const storageOptions: StorageOption[] = [
  {
    id: "cloud",
    title: "PMFreak Managed Cloud",
    description: "Fastest setup with fully managed infrastructure, governance, and encrypted storage.",
    note: "Recommended for most teams.",
    badge: "Recommended",
  },
  {
    id: "local",
    title: "Local Encrypted Storage",
    description: "Keep project memory stored locally on company-controlled infrastructure and devices.",
  },
  {
    id: "self_hosted",
    title: "Enterprise Deployment",
    description:
      "Deploy PMFreak within your own infrastructure, governance environment, and compliance architecture.",
    note: "Contact sales for deployment configuration.",
    badge: "Enterprise",
  },
];

const templates: DomainTemplate[] = [
  {
    domain: "stakeholder_intelligence",
    title: "Stakeholder map",
    text: "Sponsor: CFO | Decision power: high | Support level: neutral | Escalation behavior: direct to steering committee",
    why: "Stakeholder signals drive escalation probability.",
    critical: "Escalation owner",
  },
  {
    domain: "delivery_intelligence",
    title: "Delivery baseline",
    text: "Current status: amber | Milestones: UAT, Go-live | Blockers: vendor API delay | Delivery confidence: 62",
    why: "Delivery confidence anchors intervention urgency.",
    critical: "Critical path risks",
  },
  {
    domain: "pmo_governance",
    title: "Governance cadence",
    text: "Reporting cadence: weekly | Escalation rules: PM -> Sponsor in 24h | Quality gates: UAT sign-off",
    why: "Governance coherence prevents late surprises.",
    critical: "Escalation rules",
  },
  {
    domain: "team_health",
    title: "PM load",
    text: "PM name: Alex | Workload level: high | Meeting pressure: elevated | Fatigue risk: medium-high",
    why: "PM fatigue often predicts delivery degradation.",
    critical: "Support needed",
  },
  {
    domain: "risk_intelligence",
    title: "Top risk",
    text: "Risk name: Data migration overrun | Severity: high | Probability: medium | Owner: Delivery lead",
    why: "Untreated risks silently compound governance gaps.",
    critical: "Mitigation owner",
  },
  {
    domain: "executive_context",
    title: "Executive framing",
    text: "Sponsor: COO | Strategic importance: high | Decision deadlines: quarter close | Budget sensitivity: medium",
    why: "Executive context tunes escalation sensitivity.",
    critical: "Decision deadline",
  },
];

const companyFields: Array<{ key: keyof OnboardingForm; label: string }> = [
  { key: "companyName", label: "Company name" },
  { key: "pmoMaturity", label: "PMO maturity" },
  { key: "industry", label: "Industry" },
  { key: "deliveryModel", label: "Delivery model" },
  { key: "teamSize", label: "Team size" },
  { key: "activeProjects", label: "Active projects" },
];

const projectFields: Array<{ key: keyof OnboardingForm; label: string }> = [
  { key: "projectName", label: "Project name" },
  { key: "sponsor", label: "Sponsor" },
  { key: "pm", label: "PM" },
  { key: "timeline", label: "Timeline" },
  { key: "deliveryConfidence", label: "Delivery confidence" },
  { key: "projectType", label: "Project type" },
];

function StepNavigation({
  currentStep,
  onStepClick,
}: {
  currentStep: StepId;
  onStepClick: (step: StepId) => void;
}) {
  return (
    <div className="mb-6 grid gap-2 md:grid-cols-5">
      {onboardingSteps.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onStepClick(item.id)}
          className={`rounded-2xl border px-3 py-2 text-left transition-all ${
            currentStep === item.id
              ? "border-cyan-300/60 bg-cyan-400/15"
              : "border-white/10 bg-white/5 hover:border-white/20"
          }`}
        >
          <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-200/90">Step {item.id}</p>
          <p className="text-sm font-medium text-slate-100">{item.title}</p>
          <p className="text-xs text-slate-400">{item.subtitle}</p>
        </button>
      ))}
    </div>
  );
}

function ProgressBar({ step }: { step: StepId }) {
  return (
    <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-white/10">
      <div
        className="h-full rounded-full bg-gradient-to-r from-cyan-400/80 via-cyan-300/80 to-violet-300/70 transition-all duration-500"
        style={{ width: `${(step / onboardingSteps.length) * 100}%` }}
      />
    </div>
  );
}

function StorageOptionCard({
  option,
  selected,
  onSelect,
}: {
  option: StorageOption;
  selected: boolean;
  onSelect: (option: StorageStrategy) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(option.id)}
      className={`group relative w-full overflow-hidden rounded-2xl border p-5 text-left transition-all duration-300 ${
        selected
          ? "border-cyan-300/80 bg-cyan-400/12 shadow-[0_14px_40px_-18px_rgba(34,211,238,0.9)]"
          : "border-white/10 bg-white/[0.04] hover:border-cyan-300/40 hover:bg-cyan-300/[0.06]"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_0%,rgba(34,211,238,0.16),transparent_55%)] opacity-90" />
      <div className="relative space-y-2">
        <div className="flex items-start justify-between gap-3">
          <p className="text-base font-medium text-slate-100">{option.title}</p>
          {option.badge ? (
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                option.badge === "Recommended"
                  ? "border-cyan-300/70 bg-cyan-400/20 text-cyan-100"
                  : "border-violet-300/50 bg-violet-300/15 text-violet-100"
              }`}
            >
              {option.badge}
            </span>
          ) : null}
        </div>
        <p className="text-sm leading-relaxed text-slate-300">{option.description}</p>
        {option.note ? <p className="text-xs font-medium text-slate-200">{option.note}</p> : null}
        <p className="pt-1 text-xs text-slate-400">
          {selected ? "Selected for activation" : "Select storage strategy"}
        </p>
      </div>
    </button>
  );
}

export function GettingStartedFlow() {
  const router = useRouter();
  const [step, setStep] = useState<StepId>(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<OnboardingForm>({
    companyName: "",
    pmoMaturity: "Developing",
    industry: "Technology",
    deliveryModel: "Hybrid",
    teamSize: "25",
    activeProjects: "8",
    projectName: "",
    sponsor: "",
    pm: "",
    timeline: "",
    deliveryConfidence: "68",
    projectType: "Transformation",
    storageStrategy: "cloud",
  });
  const [rows, setRows] = useState<DomainTemplate[]>(templates);
  const completedRef = useRef(false);
  const stepRef = useRef<StepId>(1);

  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  useEffect(() => {
    void fetch("/api/telemetry/first-user", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventType: "onboarding_started", metadata: { surface: "getting_started" } }) });
    return () => {
      if (completedRef.current) return;
      void fetch("/api/telemetry/first-user", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventType: "onboarding_abandoned", metadata: { lastStep: stepRef.current } }) });
    };
  }, []);

  const completion = useMemo(
    () =>
      rows.map((row) => {
        const len = row.text.trim().length;
        const completionScore = Math.min(100, Math.max(38, Math.round(len / 2.4)));
        const confidence = Math.max(45, completionScore - 9);
        return {
          ...row,
          completionScore,
          confidence,
          missing: `Missing ${row.critical} may reduce ${row.domain.replaceAll("_", " ")} confidence.`,
        };
      }),
    [rows],
  );

  const readiness = useMemo(() => {
    const contextFields = [form.companyName, form.projectName, form.sponsor, form.pm, form.timeline].filter(
      (value) => value.trim().length > 0,
    ).length;
    const contextCoverage = Math.round((contextFields / 5) * 100);
    const templateCoverage = Math.round(
      completion.reduce((accumulator, item) => accumulator + item.completionScore, 0) / completion.length,
    );
    const storageBonus =
      form.storageStrategy === "self_hosted" ? 20 : form.storageStrategy === "local" ? 15 : 10;
    const governanceCompleteness = Math.min(
      100,
      Math.round(contextCoverage * 0.45 + templateCoverage * 0.35 + storageBonus),
    );
    const operationalCoherence = Math.min(
      100,
      Math.round(templateCoverage * 0.55 + Number(form.deliveryConfidence) * 0.25 + contextCoverage * 0.2),
    );
    const readinessScore = Math.round(
      (governanceCompleteness + operationalCoherence + templateCoverage) / 3,
    );

    return { readinessScore, operationalCoherence, governanceCompleteness, templateCoverage };
  }, [completion, form]);

  const updateField = (key: keyof OnboardingForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const run = async (demo = false) => {
    setLoading(true);
    const response = await fetch("/api/getting-started", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ form, templates: rows, loadSample: demo }),
    });
    setLoading(false);
    if (response.ok) {
      completedRef.current = true;
      await fetch("/api/telemetry/first-user", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventType: "onboarding_completed", metadata: { readinessScore: readiness.readinessScore } }) });
      router.push("/executive?from=getting-started");
    }
  };

  return (
    <main className="space-y-8 pb-12">
      <header className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">Getting Started</p>
        <h1 className="mt-2 text-3xl font-semibold">Set up PMFreak in minutes</h1>
      </header>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <StepNavigation currentStep={step} onStepClick={setStep} />
        <ProgressBar step={step} />

        {step === 1 && (
          <div className="grid gap-4 md:grid-cols-2">
            {companyFields.map((field) => (
              <label key={field.key} className="text-xs text-slate-300">
                {field.label}
                <input
                  value={form[field.key]}
                  onChange={(event) => updateField(field.key, event.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-white/30 px-3 py-2"
                />
              </label>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4 md:grid-cols-2">
            {projectFields.map((field) => (
              <label key={field.key} className="text-xs text-slate-300">
                {field.label}
                <input
                  value={form[field.key]}
                  onChange={(event) => updateField(field.key, event.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-white/30 px-3 py-2"
                />
              </label>
            ))}
          </div>
        )}

        {step === 3 && (
          <section className="space-y-7 rounded-3xl border border-cyan-200/20 bg-gradient-to-b from-cyan-400/[0.05] via-white/[0.03] to-transparent p-6 md:p-8">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">Project Governance Layer</p>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-100">Your Project Workspace</h2>
              <p className="text-base text-slate-200">Your company data stays under your control.</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-sm leading-relaxed text-slate-300">PMFreak was designed to help organizations retain ownership over their project intelligence.</p>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">Project conversations, stakeholder context, timelines, risks, decisions, and institutional memory can live inside a dedicated workspace controlled by your organization.</p>
              <p className="mt-3 text-sm font-medium text-cyan-100">Powered by AOC Protocol.</p>
            </div>

            <blockquote className="rounded-2xl border-l-4 border-cyan-300/80 bg-cyan-300/[0.08] px-5 py-4 text-base italic text-slate-100 shadow-[0_0_45px_-28px_rgba(34,211,238,0.9)]">
              “Your project memory should stay with your team — not scattered across disconnected tools.”
            </blockquote>

            <div className="h-px bg-gradient-to-r from-transparent via-cyan-200/60 to-transparent" />

            <div className="grid gap-4 lg:grid-cols-3">
              {storageOptions.map((option) => (
                <StorageOptionCard
                  key={option.id}
                  option={option}
                  selected={form.storageStrategy === option.id}
                  onSelect={(storageStrategy) => setForm((prev) => ({ ...prev, storageStrategy }))}
                />
              ))}
            </div>
          </section>
        )}

        {step === 4 && (
          <div className="space-y-3">
            {rows.map((row, index) => (
              <div key={row.domain} className="rounded-2xl border border-slate-700/80 bg-white/60 p-3">
                <input
                  value={row.title}
                  onChange={(event) => {
                    setRows((prev) => {
                      const next = [...prev];
                      next[index] = { ...row, title: event.target.value };
                      return next;
                    });
                  }}
                  className="w-full bg-transparent text-sm font-semibold"
                />
                <textarea
                  value={row.text}
                  onChange={(event) => {
                    setRows((prev) => {
                      const next = [...prev];
                      next[index] = { ...row, text: event.target.value };
                      return next;
                    });
                  }}
                  rows={2}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-slate-800/70 p-2 text-xs text-slate-300"
                />
                <p className="mt-2 text-[11px] text-slate-400">{row.why}</p>
              </div>
            ))}
          </div>
        )}

        {step === 5 && (
          <section className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-cyan-300/30 bg-cyan-400/[0.06] p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Activation Review</p>
              <h3 className="mt-1 text-xl font-semibold text-slate-100">Project readiness dashboard</h3>
              <div className="mt-4 space-y-2 text-sm text-slate-200">
                <p><span className="text-slate-400">Company:</span> {form.companyName || "Not provided"}</p>
                <p><span className="text-slate-400">Project:</span> {form.projectName || "Not provided"}</p>
                <p><span className="text-slate-400">Vault strategy:</span> {storageOptions.find((s) => s.id === form.storageStrategy)?.title}</p>
                <p><span className="text-slate-400">Project intelligence:</span> {readiness.templateCoverage}% complete</p>
              </div>
            </article>

            <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm font-semibold text-slate-100">Enterprise activation signals</p>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="rounded-xl border border-white/10 p-3">
                  <p className="text-[11px] text-slate-400">Readiness score</p>
                  <p className="text-xl font-semibold text-cyan-200">{readiness.readinessScore}%</p>
                </div>
                <div className="rounded-xl border border-white/10 p-3">
                  <p className="text-[11px] text-slate-400">Operational coherence</p>
                  <p className="text-xl font-semibold text-cyan-200">{readiness.operationalCoherence}%</p>
                </div>
                <div className="rounded-xl border border-white/10 p-3">
                  <p className="text-[11px] text-slate-400">Governance completeness</p>
                  <p className="text-xl font-semibold text-cyan-200">{readiness.governanceCompleteness}%</p>
                </div>
              </div>
            </article>
          </section>
        )}

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setStep((prev) => Math.max(1, prev - 1) as StepId)}
            disabled={step === 1}
            className="rounded-xl border border-white/20 px-4 py-2 text-sm disabled:opacity-40"
          >
            Back
          </button>
          {step < 5 && (
            <button
              type="button"
              onClick={() => setStep((prev) => Math.min(5, prev + 1) as StepId)}
              className="rounded-xl border border-cyan-300/60 px-4 py-2 text-sm"
            >
              Continue
            </button>
          )}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm font-semibold">Intelligence completion</p>
          <div className="mt-3 space-y-2">
            {completion.map((item) => (
              <div key={item.domain} className="rounded-xl border border-white/10 p-3">
                <p className="text-xs text-slate-200">{item.title}</p>
                <p className="text-[11px] text-slate-400">
                  Completion {item.completionScore}% • Confidence {item.confidence}%
                </p>
                <p className="text-[11px] text-amber-300">{item.missing}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => run(false)}
          disabled={loading}
          className="rounded-xl border border-cyan-300/60 px-4 py-2 text-sm"
        >
          {loading ? "Saving..." : "Complete activation"}
        </button>
        <button
          type="button"
          onClick={() => run(true)}
          disabled={loading}
          className="rounded-xl border border-violet-300/60 px-4 py-2 text-sm"
        >
          Load PMFreak Sample Project
        </button>
      </div>
    </main>
  );
}
