export default function TrialInactivePage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-slate-100">
      <div className="space-y-4 rounded-3xl border border-white/10 bg-white/[0.04] p-7 md:p-8">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Early access status</p>
        <h1 className="text-2xl font-semibold">Your workspace access is currently inactive.</h1>
        <p className="text-slate-300">
          This usually means your trial window has ended, access was intentionally withdrawn, or activation was not completed.
          Your data posture remains safe while access is paused.
        </p>

        <div className="rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-slate-200">
          <p className="font-medium text-slate-100">Recovery guidance</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-300">
            <li>Confirm you are signed in with the invited account.</li>
            <li>Check whether your founder invite approval is still pending.</li>
            <li>Contact the founder team to request restoration or extension.</li>
          </ul>
        </div>

        <p className="text-sm text-slate-300">Need help now? Reach out to your founder contact or support placeholder: <span className="text-slate-100">founder@pmfreak.ai</span></p>
      </div>
    </main>
  );
}
