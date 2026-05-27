import Link from "next/link";

export function WorkspaceContextBanner({
  lens,
  returnHref = "/workspace",
}: {
  lens: string;
  returnHref?: string;
}) {
  return (
    <section className="rounded-2xl border border-cyan-300/25 bg-cyan-300/[0.06] px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-200">Workspace / {lens}</p>
        <Link href={returnHref} className="rounded-lg border border-cyan-300/40 bg-cyan-300/10 px-3 py-1.5 text-xs font-medium text-cyan-100 transition hover:bg-cyan-300/20">
          Workspace
        </Link>
      </div>
    </section>
  );
}
