import type { ReactNode } from "react";

type Metric = { label: string; value: string; delta?: string };

export function ModuleShell({
  title,
  subtitle,
  metrics,
  children,
}: {
  title: string;
  subtitle: string;
  metrics: Metric[];
  children: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
        <h1 className="text-2xl font-semibold md:text-3xl">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">{subtitle}</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <article key={metric.label} className="rounded-2xl border border-white/10 bg-white/20 p-4">
              <p className="text-xs uppercase tracking-wider text-cyan-200">{metric.label}</p>
              <p className="mt-2 text-xl font-semibold">{metric.value}</p>
              {metric.delta ? <p className="mt-1 text-xs text-slate-400">{metric.delta}</p> : null}
            </article>
          ))}
        </div>
      </header>
      {children}
    </div>
  );
}
