import { CreatePmoWizard } from "@/components/pmfreak/pmo/create-pmo-wizard";

export default function CreatePmoPage() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#050507] p-6 shadow-[0_40px_120px_rgba(0,0,0,0.55)] md:p-10">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:38px_38px]" />
      <div className="pointer-events-none absolute -left-24 top-14 h-80 w-80 rounded-full bg-indigo-500/15 blur-[140px]" />
      <div className="pointer-events-none absolute right-[-6%] top-14 h-96 w-96 rounded-full bg-cyan-400/12 blur-[170px]" />

      <div className="relative">
        <header className="mb-8">
          <p className="text-[10px] uppercase tracking-[0.3em] text-indigo-300/70">PMFreak</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">
            Create PMO
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
            Define the governance skeleton PMFreak will use to understand how your projects should be managed.
          </p>
        </header>

        <CreatePmoWizard />
      </div>
    </section>
  );
}
