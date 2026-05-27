"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PMORole, DeliveryControl, EscalationRule, PMOGovernanceSkeleton } from "@/lib/pmo/pmo-governance-types";
import { INITIAL_PMO_SKELETON } from "@/lib/pmo/pmo-governance-defaults";

const STEPS = [
  "PMO Identity",
  "Governance Model",
  "Roles & Responsibilities",
  "Delivery Controls",
  "Escalation Rules",
  "Review & Create",
] as const;

type WizardData = Omit<PMOGovernanceSkeleton, "createdAt" | "updatedAt">;

const PMO_STORAGE_KEY = "pmfreak.pmo.skeleton";

const inputCls =
  "block w-full rounded-xl border border-white/15 bg-slate-950/75 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300/70";
const selectCls = `${inputCls} [&>option]:bg-slate-900`;
const labelCls = "flex flex-col gap-1.5 text-[11px] uppercase tracking-[0.14em] text-zinc-400";

function ToggleButton({
  active,
  onToggle,
  labelOn = "Enabled",
  labelOff = "Disabled",
}: {
  active: boolean;
  onToggle: () => void;
  labelOn?: string;
  labelOff?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
        active
          ? "border border-cyan-300/40 bg-cyan-400/15 text-cyan-100"
          : "border border-white/10 bg-white/[0.03] text-zinc-500 hover:text-zinc-300"
      }`}
    >
      {active ? labelOn : labelOff}
    </button>
  );
}

function validate(step: number, data: WizardData): string[] {
  const errs: string[] = [];
  switch (step) {
    case 1:
      if (!data.identity.name.trim()) errs.push("PMO name is required.");
      if (!data.identity.organization.trim()) errs.push("Organization is required.");
      if (!data.identity.pmoType) errs.push("PMO type is required.");
      if (!data.identity.language) errs.push("Main operating language is required.");
      break;
    case 2:
      if (!data.governanceModel.governanceStyle) errs.push("Governance style is required.");
      if (!data.governanceModel.approvalModel) errs.push("Approval model is required.");
      if (!data.governanceModel.reportingCadence) errs.push("Reporting cadence is required.");
      if (!data.governanceModel.escalationCadence) errs.push("Escalation cadence is required.");
      break;
    case 3:
      if (data.roles.length === 0) errs.push("At least one role is required.");
      data.roles.forEach((r, i) => {
        if (!r.roleName.trim()) errs.push(`Role ${i + 1} must have a name.`);
      });
      break;
    case 4:
      data.deliveryControls.forEach((c) => {
        if (c.enabled && !c.ownerRole.trim()) errs.push(`"${c.name}" is enabled but has no owner role.`);
      });
      break;
  }
  return errs;
}

function humanize(value: string): string {
  return value
    .replace(/-/g, " ")
    .replace(/\bpm\b/gi, "PM")
    .replace(/\bpmo\b/gi, "PMO")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function CreatePmoWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(INITIAL_PMO_SKELETON);
  const [errors, setErrors] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const totalSteps = STEPS.length;

  const handleNext = () => {
    const errs = validate(step, data);
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    setErrors([]);
    setStep((s) => Math.min(s + 1, totalSteps));
  };

  const handleBack = () => {
    setErrors([]);
    setStep((s) => Math.max(s - 1, 1));
  };

  const handleCreate = () => {
    setCreating(true);
    const skeleton: PMOGovernanceSkeleton = {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(PMO_STORAGE_KEY, JSON.stringify(skeleton));
    } catch {
      // localStorage unavailable — skeleton lives in session memory only
    }
    router.push("/workspace");
  };

  const setIdentity = (field: keyof typeof data.identity, value: string) =>
    setData((d) => ({ ...d, identity: { ...d.identity, [field]: value } }));

  const setGovernance = (field: keyof typeof data.governanceModel, value: string) =>
    setData((d) => ({ ...d, governanceModel: { ...d.governanceModel, [field]: value } }));

  const updateRole = (id: string, field: keyof PMORole, value: string | boolean) =>
    setData((d) => ({
      ...d,
      roles: d.roles.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    }));

  const addRole = () => {
    const newRole: PMORole = {
      id: `role-${Date.now()}`,
      roleName: "",
      personName: "",
      email: "",
      responsibility: "",
      approvalAuthority: false,
      escalationAuthority: false,
    };
    setData((d) => ({ ...d, roles: [...d.roles, newRole] }));
  };

  const removeRole = (id: string) =>
    setData((d) => ({ ...d, roles: d.roles.filter((r) => r.id !== id) }));

  const updateControl = (id: string, field: keyof DeliveryControl, value: string | boolean) =>
    setData((d) => ({
      ...d,
      deliveryControls: d.deliveryControls.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    }));

  const updateEscalation = (id: string, field: keyof EscalationRule, value: string | boolean) =>
    setData((d) => ({
      ...d,
      escalationRules: d.escalationRules.map((e) => (e.id === id ? { ...e, [field]: value } : e)),
    }));

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <label className={labelCls}>
                PMO / Workspace Name <span className="text-red-400 normal-case">*</span>
                <input
                  className={inputCls}
                  placeholder="Global Operations PMO"
                  value={data.identity.name}
                  onChange={(e) => setIdentity("name", e.target.value)}
                />
              </label>
              <label className={labelCls}>
                Organization / Company <span className="text-red-400 normal-case">*</span>
                <input
                  className={inputCls}
                  placeholder="Acme Corporation"
                  value={data.identity.organization}
                  onChange={(e) => setIdentity("organization", e.target.value)}
                />
              </label>
            </div>

            <label className={labelCls}>
              PMO Type <span className="text-red-400 normal-case">*</span>
              <select
                className={selectCls}
                value={data.identity.pmoType}
                onChange={(e) => setIdentity("pmoType", e.target.value)}
              >
                <option value="">Select PMO type…</option>
                <option value="internal">Internal PMO</option>
                <option value="client-delivery">Client Delivery PMO</option>
                <option value="consulting">Consulting PMO</option>
                <option value="startup-product">Startup / Product Delivery</option>
                <option value="enterprise-portfolio">Enterprise Portfolio Office</option>
              </select>
            </label>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className={labelCls}>
                Industry
                <input
                  className={inputCls}
                  placeholder="Technology, Finance, Healthcare…"
                  value={data.identity.industry}
                  onChange={(e) => setIdentity("industry", e.target.value)}
                />
              </label>
              <label className={labelCls}>
                Main Operating Language <span className="text-red-400 normal-case">*</span>
                <select
                  className={selectCls}
                  value={data.identity.language}
                  onChange={(e) => setIdentity("language", e.target.value)}
                >
                  <option value="">Select language…</option>
                  <option value="english">English</option>
                  <option value="spanish">Spanish</option>
                  <option value="bilingual">Bilingual</option>
                </select>
              </label>
            </div>

            <label className={labelCls}>
              Time Zone
              <input
                className={inputCls}
                placeholder="UTC-5 (Eastern), UTC+1 (CET)…"
                value={data.identity.timeZone}
                onChange={(e) => setIdentity("timeZone", e.target.value)}
              />
            </label>
          </div>
        );

      case 2:
        return (
          <div className="space-y-5">
            <label className={labelCls}>
              Governance Style <span className="text-red-400 normal-case">*</span>
              <select
                className={selectCls}
                value={data.governanceModel.governanceStyle}
                onChange={(e) => setGovernance("governanceStyle", e.target.value)}
              >
                <option value="">Select governance style…</option>
                <option value="lightweight">Lightweight</option>
                <option value="standard">Standard</option>
                <option value="strict-enterprise">Strict / Enterprise</option>
              </select>
            </label>

            <label className={labelCls}>
              Approval Model <span className="text-red-400 normal-case">*</span>
              <select
                className={selectCls}
                value={data.governanceModel.approvalModel}
                onChange={(e) => setGovernance("approvalModel", e.target.value)}
              >
                <option value="">Select approval model…</option>
                <option value="pm-only">PM only</option>
                <option value="pm-pmo-lead">PM + PMO Lead</option>
                <option value="pm-finance-technical">PM + Finance + Technical Lead</option>
                <option value="executive-approval">Executive approval required</option>
              </select>
            </label>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className={labelCls}>
                Reporting Cadence <span className="text-red-400 normal-case">*</span>
                <select
                  className={selectCls}
                  value={data.governanceModel.reportingCadence}
                  onChange={(e) => setGovernance("reportingCadence", e.target.value)}
                >
                  <option value="">Select cadence…</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Biweekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </label>
              <label className={labelCls}>
                Escalation Cadence <span className="text-red-400 normal-case">*</span>
                <select
                  className={selectCls}
                  value={data.governanceModel.escalationCadence}
                  onChange={(e) => setGovernance("escalationCadence", e.target.value)}
                >
                  <option value="">Select escalation cadence…</option>
                  <option value="as-needed">As needed</option>
                  <option value="weekly-review">Weekly review</option>
                  <option value="formal-escalation-board">Formal escalation board</option>
                </select>
              </label>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <p className="text-xs leading-relaxed text-zinc-500">
              Define who PMFreak should involve in recommendations, escalations, approvals, and follow-ups.
              Edit any default role or add a custom one.
            </p>
            <div className="space-y-3">
              {data.roles.map((role, i) => (
                <div key={role.id} className="rounded-2xl border border-white/[0.07] bg-black/30 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">Role {i + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeRole(role.id)}
                      className="rounded-lg border border-white/[0.06] px-2.5 py-1 text-[10px] text-zinc-600 transition hover:border-red-400/30 hover:text-red-400"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className={labelCls}>
                      Role Name
                      <input
                        className={inputCls}
                        placeholder="e.g. PMO Lead"
                        value={role.roleName}
                        onChange={(e) => updateRole(role.id, "roleName", e.target.value)}
                      />
                    </label>
                    <label className={labelCls}>
                      Person Name
                      <input
                        className={inputCls}
                        placeholder="Full name"
                        value={role.personName}
                        onChange={(e) => updateRole(role.id, "personName", e.target.value)}
                      />
                    </label>
                    <label className={labelCls}>
                      Email
                      <input
                        className={inputCls}
                        type="email"
                        placeholder="person@company.com"
                        value={role.email}
                        onChange={(e) => updateRole(role.id, "email", e.target.value)}
                      />
                    </label>
                    <label className={labelCls}>
                      Responsibility
                      <input
                        className={inputCls}
                        placeholder="Key responsibility area"
                        value={role.responsibility}
                        onChange={(e) => updateRole(role.id, "responsibility", e.target.value)}
                      />
                    </label>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-5">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-zinc-500">Approval Authority</span>
                      <ToggleButton
                        active={role.approvalAuthority}
                        onToggle={() => updateRole(role.id, "approvalAuthority", !role.approvalAuthority)}
                        labelOn="Yes"
                        labelOff="No"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-zinc-500">Escalation Authority</span>
                      <ToggleButton
                        active={role.escalationAuthority}
                        onToggle={() => updateRole(role.id, "escalationAuthority", !role.escalationAuthority)}
                        labelOn="Yes"
                        labelOff="No"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addRole}
              className="w-full rounded-xl border border-dashed border-white/15 py-2.5 text-sm text-zinc-500 transition hover:border-indigo-300/30 hover:text-indigo-300"
            >
              + Add custom role
            </button>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <p className="text-xs leading-relaxed text-zinc-500">
              Configure which governance controls PMFreak should actively monitor. Enabled controls require an owner role.
            </p>
            <div className="space-y-3">
              {data.deliveryControls.map((ctrl) => (
                <div
                  key={ctrl.id}
                  className={`rounded-2xl border p-4 transition-colors ${
                    ctrl.enabled
                      ? "border-indigo-300/20 bg-black/30"
                      : "border-white/[0.05] bg-black/15"
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className={`text-sm font-semibold ${ctrl.enabled ? "text-slate-200" : "text-zinc-600"}`}>
                      {ctrl.name}
                    </span>
                    <ToggleButton
                      active={ctrl.enabled}
                      onToggle={() => updateControl(ctrl.id, "enabled", !ctrl.enabled)}
                    />
                  </div>
                  {ctrl.enabled && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className={labelCls}>
                        Owner Role
                        <input
                          className={inputCls}
                          placeholder="PMO Lead"
                          value={ctrl.ownerRole}
                          onChange={(e) => updateControl(ctrl.id, "ownerRole", e.target.value)}
                        />
                      </label>
                      <label className={labelCls}>
                        Review Frequency
                        <select
                          className={selectCls}
                          value={ctrl.reviewFrequency}
                          onChange={(e) => updateControl(ctrl.id, "reviewFrequency", e.target.value)}
                        >
                          <option value="weekly">Weekly</option>
                          <option value="biweekly">Biweekly</option>
                          <option value="monthly">Monthly</option>
                          <option value="per-milestone">Per milestone</option>
                        </select>
                      </label>
                      <label className={labelCls}>
                        Required Evidence
                        <input
                          className={inputCls}
                          placeholder="e.g. Signed change request"
                          value={ctrl.requiredEvidence}
                          onChange={(e) => updateControl(ctrl.id, "requiredEvidence", e.target.value)}
                        />
                      </label>
                      <label className={labelCls}>
                        Escalation Threshold
                        <input
                          className={inputCls}
                          placeholder="e.g. >5% variance"
                          value={ctrl.escalationThreshold}
                          onChange={(e) => updateControl(ctrl.id, "escalationThreshold", e.target.value)}
                        />
                      </label>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <p className="text-xs leading-relaxed text-zinc-500">
              Define when PMFreak should intervene and how to escalate each situation. Adjust defaults to match your organization.
            </p>
            <div className="space-y-3">
              {data.escalationRules.map((rule) => (
                <div
                  key={rule.id}
                  className={`rounded-2xl border p-4 transition-colors ${
                    rule.enabled
                      ? "border-indigo-300/20 bg-black/30"
                      : "border-white/[0.05] bg-black/15"
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className={`text-sm font-semibold ${rule.enabled ? "text-slate-200" : "text-zinc-600"}`}>
                      {rule.triggerName}
                    </span>
                    <ToggleButton
                      active={rule.enabled}
                      onToggle={() => updateEscalation(rule.id, "enabled", !rule.enabled)}
                    />
                  </div>
                  {rule.enabled && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className={labelCls}>
                        Severity
                        <select
                          className={selectCls}
                          value={rule.severity}
                          onChange={(e) => updateEscalation(rule.id, "severity", e.target.value)}
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="critical">Critical</option>
                        </select>
                      </label>
                      <label className={labelCls}>
                        Time Threshold
                        <select
                          className={selectCls}
                          value={rule.timeThreshold}
                          onChange={(e) => updateEscalation(rule.id, "timeThreshold", e.target.value)}
                        >
                          <option value="same-day">Same day</option>
                          <option value="24-hours">24 hours</option>
                          <option value="48-hours">48 hours</option>
                          <option value="1-week">1 week</option>
                        </select>
                      </label>
                      <label className={labelCls}>
                        First Action
                        <input
                          className={inputCls}
                          placeholder="e.g. Notify stakeholders"
                          value={rule.firstAction}
                          onChange={(e) => updateEscalation(rule.id, "firstAction", e.target.value)}
                        />
                      </label>
                      <label className={labelCls}>
                        Escalate To
                        <input
                          className={inputCls}
                          placeholder="e.g. PMO Lead"
                          value={rule.escalateToRole}
                          onChange={(e) => updateEscalation(rule.id, "escalateToRole", e.target.value)}
                        />
                      </label>
                      <label className={labelCls}>
                        Suggested Tone
                        <select
                          className={selectCls}
                          value={rule.suggestedTone}
                          onChange={(e) => updateEscalation(rule.id, "suggestedTone", e.target.value)}
                        >
                          <option value="diplomatic">Diplomatic</option>
                          <option value="direct">Direct</option>
                          <option value="executive">Executive</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </label>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <p className="text-xs leading-relaxed text-zinc-500">
              Review your governance skeleton before creating the PMO. You can go back to adjust any step.
            </p>

            {/* Identity */}
            <div className="rounded-2xl border border-white/[0.07] bg-black/30 p-5">
              <p className="mb-3 text-[10px] uppercase tracking-[0.24em] text-indigo-300/70">PMO Identity</p>
              <dl className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
                {[
                  ["Name", data.identity.name],
                  ["Organization", data.identity.organization],
                  ["PMO Type", humanize(data.identity.pmoType)],
                  ["Industry", data.identity.industry || "—"],
                  ["Language", humanize(data.identity.language)],
                  ["Time Zone", data.identity.timeZone || "—"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">{label}</dt>
                    <dd className="mt-0.5 text-sm text-slate-200">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Governance Model */}
            <div className="rounded-2xl border border-white/[0.07] bg-black/30 p-5">
              <p className="mb-3 text-[10px] uppercase tracking-[0.24em] text-indigo-300/70">Governance Model</p>
              <dl className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
                {[
                  ["Style", humanize(data.governanceModel.governanceStyle)],
                  ["Approval Model", humanize(data.governanceModel.approvalModel)],
                  ["Reporting", humanize(data.governanceModel.reportingCadence)],
                  ["Escalation", humanize(data.governanceModel.escalationCadence)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">{label}</dt>
                    <dd className="mt-0.5 text-sm text-slate-200">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Roles */}
            <div className="rounded-2xl border border-white/[0.07] bg-black/30 p-5">
              <p className="mb-3 text-[10px] uppercase tracking-[0.24em] text-indigo-300/70">
                Roles &amp; Responsibilities ({data.roles.length})
              </p>
              <div className="space-y-1.5">
                {data.roles.map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/[0.03] px-3 py-2"
                  >
                    <div className="text-sm">
                      <span className="font-medium text-slate-200">{r.roleName}</span>
                      {r.personName && (
                        <span className="ml-2 text-zinc-500">— {r.personName}</span>
                      )}
                    </div>
                    <div className="flex gap-1.5">
                      {r.approvalAuthority && (
                        <span className="rounded-full border border-indigo-300/30 bg-indigo-400/10 px-2 py-0.5 text-[10px] text-indigo-200">
                          Approver
                        </span>
                      )}
                      {r.escalationAuthority && (
                        <span className="rounded-full border border-amber-300/30 bg-amber-400/10 px-2 py-0.5 text-[10px] text-amber-200">
                          Escalation
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Controls */}
            <div className="rounded-2xl border border-white/[0.07] bg-black/30 p-5">
              <p className="mb-3 text-[10px] uppercase tracking-[0.24em] text-indigo-300/70">
                Delivery Controls ({data.deliveryControls.filter((c) => c.enabled).length} of {data.deliveryControls.length} enabled)
              </p>
              <div className="flex flex-wrap gap-2">
                {data.deliveryControls.map((c) => (
                  <span
                    key={c.id}
                    className={`rounded-full border px-2.5 py-1 text-[11px] ${
                      c.enabled
                        ? "border-cyan-300/30 bg-cyan-400/10 text-cyan-200"
                        : "border-white/[0.06] text-zinc-600"
                    }`}
                  >
                    {c.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Escalation Rules */}
            <div className="rounded-2xl border border-white/[0.07] bg-black/30 p-5">
              <p className="mb-3 text-[10px] uppercase tracking-[0.24em] text-indigo-300/70">
                Escalation Rules ({data.escalationRules.filter((e) => e.enabled).length} of {data.escalationRules.length} enabled)
              </p>
              <div className="flex flex-wrap gap-2">
                {data.escalationRules.map((e) => (
                  <span
                    key={e.id}
                    className={`rounded-full border px-2.5 py-1 text-[11px] ${
                      e.enabled
                        ? "border-amber-300/30 bg-amber-400/10 text-amber-200"
                        : "border-white/[0.06] text-zinc-600"
                    }`}
                  >
                    {e.triggerName}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-5">
      {/* Step indicator */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {STEPS.map((label, i) => {
          const stepNum = i + 1;
          const isDone = stepNum < step;
          const isCurrent = stepNum === step;
          return (
            <div key={label} className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => { if (isDone) { setErrors([]); setStep(stepNum); } }}
                disabled={!isDone}
                className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs transition-colors ${
                  isCurrent
                    ? "border border-indigo-300/50 bg-indigo-400/15 text-indigo-100"
                    : isDone
                    ? "cursor-pointer border border-white/10 bg-white/[0.04] text-zinc-400 hover:text-slate-200"
                    : "cursor-default border border-white/[0.04] text-zinc-700"
                }`}
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                    isCurrent
                      ? "bg-indigo-400/30 text-indigo-100"
                      : isDone
                      ? "bg-white/10 text-zinc-300"
                      : "bg-white/[0.04] text-zinc-700"
                  }`}
                >
                  {isDone ? "✓" : stepNum}
                </span>
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{stepNum}</span>
              </button>
              {i < STEPS.length - 1 && (
                <span
                  className={`h-px w-3 shrink-0 ${
                    stepNum < step ? "bg-indigo-300/30" : "bg-white/[0.06]"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content card */}
      <div className="rounded-2xl border border-white/[0.08] bg-slate-950/60 p-5 md:p-7">
        <div className="mb-6">
          <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-600">
            Step {step} of {totalSteps}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">{STEPS[step - 1]}</h2>
        </div>
        {renderStep()}
      </div>

      {/* Validation errors */}
      {errors.length > 0 && (
        <div className="rounded-xl border border-red-400/25 bg-red-400/[0.06] p-4">
          <ul className="space-y-1">
            {errors.map((err) => (
              <li key={err} className="text-sm text-red-300">
                {err}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          disabled={step === 1}
          className="rounded-xl border border-white/10 px-5 py-2.5 text-sm text-zinc-400 transition hover:border-white/20 hover:text-slate-200 disabled:cursor-default disabled:opacity-30"
        >
          Back
        </button>

        {step < totalSteps ? (
          <button
            type="button"
            onClick={handleNext}
            className="rounded-xl border border-indigo-200/40 bg-indigo-400/[0.12] px-6 py-2.5 text-sm font-semibold text-indigo-100 transition hover:bg-indigo-400/[0.2]"
          >
            Next →
          </button>
        ) : (
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            className="rounded-xl border border-cyan-200/40 bg-cyan-400/[0.12] px-6 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/[0.2] disabled:opacity-60"
          >
            {creating ? "Creating…" : "Create PMO"}
          </button>
        )}
      </div>
    </div>
  );
}
