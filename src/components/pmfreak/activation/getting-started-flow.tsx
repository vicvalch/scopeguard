"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type DomainTemplate = { domain: string; title: string; text: string; why: string; critical: string };
type StorageStrategy = "cloud" | "local" | "self_hosted";

type StorageOption = {
  id: StorageStrategy;
  title: string;
  description: string;
  badge?: string;
  disabled?: boolean;
};

const storageOptions: StorageOption[] = [
  { id: "cloud", title: "PMFreak Cloud", description: "Fastest setup. Fully managed by PMFreak. Recommended for most teams.", badge: "Recommended" },
  { id: "local", title: "Local Encrypted Storage", description: "Keep project history and team context on company-controlled devices." },
  { id: "self_hosted", title: "Enterprise / Self-Hosted", description: "Deploy PMFreak in your own environment with full control of project knowledge.", badge: "Coming Soon", disabled: true },
];

function OnboardingStep({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 via-white/5 to-transparent p-6 shadow-[0_20px_80px_-48px_rgba(34,211,238,0.5)]">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        {subtitle ? <p className="text-sm text-slate-300">{subtitle}</p> : null}
      </header>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function StorageOptionCard({ option, selected, onSelect }: { option: StorageOption; selected: boolean; onSelect: (option: StorageStrategy) => void }) {
  return (
    <button
      type="button"
      onClick={() => !option.disabled && onSelect(option.id)}
      disabled={option.disabled}
      className={`group w-full rounded-2xl border p-4 text-left transition-all duration-200 md:p-5 ${selected ? "border-cyan-300/70 bg-cyan-400/10 shadow-[0_10px_32px_-18px_rgba(34,211,238,0.8)]" : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"} ${option.disabled ? "cursor-not-allowed opacity-75" : "cursor-pointer"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-base font-medium text-slate-100">{option.title}</p>
        {option.badge ? <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${option.badge === "Recommended" ? "border-cyan-300/70 bg-cyan-400/20 text-cyan-100" : "border-amber-300/40 bg-amber-300/10 text-amber-200"}`}>{option.badge}</span> : null}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-slate-300">{option.description}</p>
      <p className="mt-3 text-xs text-slate-400">{selected ? "Selected" : option.disabled ? "Available in a future release" : "Choose this option"}</p>
    </button>
  );
}

const templates: DomainTemplate[] = [
  { domain: "stakeholder_intelligence", title: "Stakeholder map", text: "Sponsor: CFO | Decision power: high | Support level: neutral | Escalation behavior: direct to steering committee", why: "Stakeholder signals drive escalation probability.", critical: "Escalation owner" },
  { domain: "delivery_intelligence", title: "Delivery baseline", text: "Current status: amber | Milestones: UAT, Go-live | Blockers: vendor API delay | Delivery confidence: 62", why: "Delivery confidence anchors intervention urgency.", critical: "Critical path risks" },
  { domain: "pmo_governance", title: "Governance cadence", text: "Reporting cadence: weekly | Escalation rules: PM -> Sponsor in 24h | Quality gates: UAT sign-off", why: "Governance coherence prevents late surprises.", critical: "Escalation rules" },
  { domain: "team_health", title: "PM load", text: "PM name: Alex | Workload level: high | Meeting pressure: elevated | Fatigue risk: medium-high", why: "PM fatigue often predicts delivery degradation.", critical: "Support needed" },
  { domain: "risk_intelligence", title: "Top risk", text: "Risk name: Data migration overrun | Severity: high | Probability: medium | Owner: Delivery lead", why: "Untreated risks silently compound governance gaps.", critical: "Mitigation owner" },
  { domain: "executive_context", title: "Executive framing", text: "Sponsor: COO | Strategic importance: high | Decision deadlines: quarter close | Budget sensitivity: medium", why: "Executive context tunes escalation sensitivity.", critical: "Decision deadline" },
];

export function GettingStartedFlow() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
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
    storageStrategy: "cloud" as StorageStrategy,
  });
  const [rows, setRows] = useState(templates);

  const completion = useMemo(() => rows.map((r) => {
    const len = r.text.trim().length;
    const completionScore = Math.min(100, Math.max(38, Math.round(len / 2.4)));
    const confidence = Math.max(45, completionScore - 9);
    return { ...r, completionScore, confidence, missing: `Missing ${r.critical} may reduce ${r.domain.replaceAll("_", " ")} confidence.` };
  }), [rows]);

  const run = async (demo = false) => {
    setLoading(true);
    const res = await fetch("/api/getting-started", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ form, templates: rows, loadDemo: demo }) });
    setLoading(false);
    if (res.ok) router.push("/executive?from=getting-started");
  };

  return (
    <main className="space-y-6 pb-10">
      <header className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">Getting Started</p>
        <h1 className="mt-2 text-3xl font-semibold">Set up PMFreak in minutes</h1>
      </header>
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="mb-4 flex flex-wrap gap-2 text-xs">{[1, 2, 3, 4].map((s) => <button key={s} onClick={() => setStep(s)} className={`rounded-full px-3 py-1 transition-colors ${step === s ? "bg-cyan-400/20 text-cyan-200" : "bg-white/5 text-slate-300"}`}>Step {s}</button>)}</div>
        {step===1 && <div className="grid gap-3 md:grid-cols-2">{([ ["companyName","Company name"],["pmoMaturity","PMO maturity"],["industry","Industry"],["deliveryModel","Delivery model"],["teamSize","Team size"],["activeProjects","Active projects"] ] as const).map(([k,l])=><label key={k} className="text-xs text-slate-300">{l}<input value={form[k]} onChange={(e)=>setForm({...form,[k]:e.target.value})} className="mt-1 w-full rounded-xl border border-white/15 bg-white/30 px-3 py-2"/></label>)}</div>}
        {step===2 && <div className="grid gap-3 md:grid-cols-2">{([ ["projectName","Project name"],["sponsor","Sponsor"],["pm","PM"],["timeline","Timeline"],["deliveryConfidence","Delivery confidence"],["projectType","Project type"] ] as const).map(([k,l])=><label key={k} className="text-xs text-slate-300">{l}<input value={form[k]} onChange={(e)=>setForm({...form,[k]:e.target.value})} className="mt-1 w-full rounded-xl border border-white/15 bg-white/30 px-3 py-2"/></label>)}</div>}
        {step===3 && <OnboardingStep title="Your Project Memory Vault" subtitle="Keep project history safe and portable.">
          <p className="max-w-3xl text-sm leading-relaxed text-slate-300">PMFreak keeps your company&apos;s project knowledge centralized so your team always has shared context.</p>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">Project conversations, decisions, risks, blockers, and timelines stay in one secure place your team can rely on.</p>
          <p className="mt-3 text-sm text-slate-200">You decide where that vault is stored.</p>
          <div className="mt-5 grid gap-3 lg:grid-cols-3">{storageOptions.map((option)=><StorageOptionCard key={option.id} option={option} selected={form.storageStrategy===option.id} onSelect={(storageStrategy)=>setForm({...form,storageStrategy})}/>)}</div>
          <p className="mt-5 text-sm font-medium text-slate-100">PMFreak does not sell your project data.</p>
          <p className="mt-1 text-xs text-slate-400">You can change storage options later as your team grows.</p>
        </OnboardingStep>}
        {step===4 && <div className="space-y-3">{rows.map((r,i)=><div key={r.domain} className="rounded-2xl border border-slate-700/80 bg-white/60 p-3"><input value={r.title} onChange={(e)=>{const n=[...rows];n[i]={...r,title:e.target.value};setRows(n);}} className="w-full bg-transparent text-sm font-semibold"/><textarea value={r.text} onChange={(e)=>{const n=[...rows];n[i]={...r,text:e.target.value};setRows(n);}} rows={2} className="mt-2 w-full rounded-lg border border-white/10 bg-slate-800/70 p-2 text-xs text-slate-300"/><p className="mt-2 text-[11px] text-slate-400">{r.why}</p></div>)}</div>}
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-white/10 bg-white/5 p-5"><p className="text-sm font-semibold">Setup progress</p><div className="mt-3 space-y-2">{completion.map((c)=><div key={c.domain} className="rounded-xl border border-white/10 p-3"><p className="text-xs text-slate-200">{c.title}</p><p className="text-[11px] text-slate-400">Completion {c.completionScore}% • Confidence {c.confidence}%</p><p className="text-[11px] text-amber-300">{c.missing}</p></div>)}</div></article>
      </section>
      <div className="flex flex-wrap gap-3">
        <button onClick={()=>run(false)} disabled={loading} className="rounded-xl border border-cyan-300/60 px-4 py-2 text-sm">{loading?"Continuing...":"Continue Setup"}</button>
        <button onClick={()=>run(true)} disabled={loading} className="rounded-xl border border-violet-300/60 px-4 py-2 text-sm">See Example</button>
      </div>
    </main>
  );
}
