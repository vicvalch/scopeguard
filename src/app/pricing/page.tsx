"use client";

import { useState } from "react";
import { MarketingNavbar } from "@/components/marketing-navbar";

type Tier = "pro" | "pmo";

const plans = [
  {
    tier: "pro" as const,
    name: "Pro",
    price: "$49 / month",
    description: "For individual PMs who need stronger AI support and richer project controls.",
    features: ["Advanced AI actions", "Expanded upload + analysis limits", "Reporting exports"],
  },
  {
    tier: "pmo" as const,
    name: "PMO",
    price: "$199 / month",
    description: "For PMO teams that need multi-workspace controls, directives, and team collaboration.",
    features: ["Create PMO workspaces", "Invite team members", "PMO processes + directives"],
  },
  {
    tier: null,
    name: "Enterprise",
    price: "Custom",
    description: "For larger rollouts needing security reviews, procurement, and tailored support.",
    features: ["Security + procurement support", "Tenant controls", "Guided rollout"],
  },
];

export default function PricingPage() {
  const [loadingTier, setLoadingTier] = useState<Tier | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkout = async (tier: Tier) => {
    setLoadingTier(tier);
    setError(null);
    try {
      const response = await fetch("/api/billing/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: tier }),
      });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        setError(payload.error ?? "Unable to start checkout.");
        return;
      }
      window.location.assign(payload.url);
    } catch {
      setError("Unable to start checkout.");
    } finally {
      setLoadingTier(null);
    }
  };

  return <>
    <MarketingNavbar />
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-6 py-16 text-white"><div className="mx-auto w-full max-w-6xl space-y-8"><div className="text-center"><p className="text-xs uppercase tracking-[0.28em] text-cyan-300">PMFreak AI • Pricing</p><h1 className="mt-3 text-4xl font-semibold tracking-tight">Choose the plan that matches your PM maturity</h1><p className="mt-2 text-slate-300">Free remains available for personal workspace and basic workflows.</p></div><section className="grid gap-4 md:grid-cols-3">{plans.map((plan) => <article key={plan.name} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl"><h2 className="text-xl font-semibold">{plan.name}</h2><p className="mt-2 text-3xl font-bold text-cyan-200">{plan.price}</p><p className="mt-2 text-sm text-slate-300">{plan.description}</p><ul className="mt-4 space-y-2 text-sm text-slate-200">{plan.features.map((feature) => <li key={feature}>• {feature}</li>)}</ul><div className="mt-5">{plan.tier ? <button type="button" onClick={() => void checkout(plan.tier)} disabled={loadingTier === plan.tier} className="inline-flex h-11 items-center justify-center rounded-full bg-cyan-300 px-6 text-sm font-semibold text-slate-900 transition hover:bg-cyan-200 disabled:bg-slate-500">{loadingTier === plan.tier ? "Redirecting..." : `Upgrade to ${plan.name}`}</button> : <a href="mailto:sales@pmfreak.ai?subject=PMFreak%20Enterprise" className="inline-flex h-11 items-center justify-center rounded-full border border-cyan-300/70 px-6 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/10">Contact Sales</a>}</div></article>)}</section>{error ? <p className="text-center text-sm text-rose-200">{error}</p> : null}</div></main>
  </>;
}
