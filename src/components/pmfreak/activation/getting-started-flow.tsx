"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type DomainTemplate = { domain: string; title: string; text: string; why: string; critical: string };
const templates: DomainTemplate[] = [
  { domain: "stakeholder_intelligence", title: "Stakeholder map", text: "Sponsor: CFO | Decision power: high | Support level: neutral | Escalation behavior: direct to steering committee", why: "Stakeholder signals drive escalation probability.", critical: "Escalation owner" },
  { domain: "delivery_intelligence", title: "Delivery baseline", text: "Current status: amber | Milestones: UAT, Go-live | Blockers: vendor API delay | Delivery confidence: 62", why: "Delivery confidence anchors intervention urgency.", critical: "Critical path risks" },
  { domain: "pmo_governance", title: "Governance cadence", text: "Reporting cadence: weekly | Escalation rules: PM -> Sponsor in 24h | Quality gates: UAT sign-off", why: "Governance coherence prevents late surprises.", critical: "Escalation rules" },
  { domain: "team_health", title: "PM load", text: "PM name: Alex | Workload level: high | Meeting pressure: elevated | Fatigue risk: medium-high", why: "PM fatigue often predicts delivery degradation.", critical: "Support needed" },
  { domain: "risk_intelligence", title: "Top risk", text: "Risk name: Data migration overrun | Severity: high | Probability: medium | Owner: Delivery lead", why: "Untreated risks silently compound governance gaps.", critical: "Mitigation owner" },
  { domain: "executive_context", title: "Executive framing", text: "Sponsor: COO | Strategic importance: high | Decision deadlines: quarter close | Budget sensitivity: medium", why: "Executive context tunes escalation sensitivity.", critical: "Decision deadline" },
];

const explainers = [
  ["What PMFreak is detecting", "Cross-domain risk patterns, confidence drops, and missing governance signals before they become executive incidents."],
  ["How escalation risk works", "Escalation probability rises when delivery confidence falls while stakeholder pressure and governance gaps increase."],
  ["What operational coherence means", "Operational coherence measures whether delivery, governance, risk, and team signals tell a consistent story."],
  ["How PM fatigue affects delivery", "Sustained overload increases coordination lag, decision latency, and missed dependencies."],
  ["Why governance gaps matter", "Missing cadence, unclear approvals, or no escalation path lowers confidence and weakens intervention timing."],
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
  });
  const [rows, setRows] = useState(templates);

  const checklist = ["Add stakeholders", "Upload first project document", "Define escalation path", "Add governance cadence", "Complete risk intelligence", "Populate team health", "Run first executive synthesis"];
  const completed = 1;
  const progress = Math.round((completed / checklist.length) * 100);

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
        <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">PMFreak Activation</p>
        <h1 className="mt-2 text-3xl font-semibold">Guided Project Activation</h1>
      </header>
      <section className="grid gap-4 lg:grid-cols-3">
        {explainers.map(([t, d]) => <article key={t} className="rounded-2xl border border-white/10 bg-black/25 p-4"><p className="text-sm font-semibold">{t}</p><p className="mt-2 text-xs text-slate-300">{d}</p></article>)}
      </section>
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="mb-4 flex gap-2 text-xs">{[1,2,3].map((s)=><button key={s} onClick={()=>setStep(s)} className={`rounded-full px-3 py-1 ${step===s?"bg-cyan-400/20 text-cyan-200":"bg-white/5 text-slate-300"}`}>Step {s}</button>)}</div>
        {step===1 && <div className="grid gap-3 md:grid-cols-2">{([ ["companyName","Company name"],["pmoMaturity","PMO maturity"],["industry","Industry"],["deliveryModel","Delivery model"],["teamSize","Team size"],["activeProjects","Active projects"] ] as const).map(([k,l])=><label key={k} className="text-xs text-slate-300">{l}<input value={form[k]} onChange={(e)=>setForm({...form,[k]:e.target.value})} className="mt-1 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2"/></label>)}</div>}
        {step===2 && <div className="grid gap-3 md:grid-cols-2">{([ ["projectName","Project name"],["sponsor","Sponsor"],["pm","PM"],["timeline","Timeline"],["deliveryConfidence","Delivery confidence"],["projectType","Project type"] ] as const).map(([k,l])=><label key={k} className="text-xs text-slate-300">{l}<input value={form[k]} onChange={(e)=>setForm({...form,[k]:e.target.value})} className="mt-1 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2"/></label>)}</div>}
        {step===3 && <div className="space-y-3">{rows.map((r,i)=><div key={r.domain} className="rounded-2xl border border-slate-700/80 bg-slate-900/60 p-3"><input value={r.title} onChange={(e)=>{const n=[...rows];n[i]={...r,title:e.target.value};setRows(n);}} className="w-full bg-transparent text-sm font-semibold"/><textarea value={r.text} onChange={(e)=>{const n=[...rows];n[i]={...r,text:e.target.value};setRows(n);}} rows={2} className="mt-2 w-full rounded-lg border border-white/10 bg-slate-800/70 p-2 text-xs text-slate-300"/><p className="mt-2 text-[11px] text-slate-400">{r.why}</p></div>)}</div>}
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-white/10 bg-white/5 p-5"><p className="text-sm font-semibold">Intelligence completion</p><div className="mt-3 space-y-2">{completion.map((c)=><div key={c.domain} className="rounded-xl border border-white/10 p-3"><p className="text-xs text-slate-200">{c.title}</p><p className="text-[11px] text-slate-400">Completion {c.completionScore}% • Confidence {c.confidence}%</p><p className="text-[11px] text-amber-300">{c.missing}</p></div>)}</div></article>
        <article className="rounded-2xl border border-white/10 bg-white/5 p-5"><p className="text-sm font-semibold">What to do next</p><p className="mt-2 text-xs text-cyan-200">Progress {progress}%</p><ul className="mt-2 space-y-2 text-xs text-slate-300">{checklist.map((item,idx)=><li key={item}>{idx<completed?"✅":"⬜"} {item}</li>)}</ul><p className="mt-3 text-xs text-emerald-300">Next best action: {checklist[completed]}</p></article>
      </section>
      <div className="flex flex-wrap gap-3">
        <button onClick={()=>run(false)} disabled={loading} className="rounded-xl border border-cyan-300/60 px-4 py-2 text-sm">{loading?"Saving...":"Complete activation"}</button>
        <button onClick={()=>run(true)} disabled={loading} className="rounded-xl border border-violet-300/60 px-4 py-2 text-sm">Load PMFreak Demo Project</button>
      </div>
    </main>
  );
}
