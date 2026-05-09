import Link from "next/link";
import { requireAuthUser } from "@/lib/auth";
import { PM_MODULES } from "@/features/navigation/module-registry";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuthUser();
  const showNavigation = user.onboardingCompleted;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="mx-auto flex w-full max-w-7xl gap-6 px-5 py-6 md:px-8 md:py-8">
        {showNavigation ? (
        <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] w-72 flex-col rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl lg:flex">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">PMFreak</p>
            <h2 className="mt-3 text-xl font-semibold">Conversational PM Workspace</h2>
            <p className="mt-2 text-xs text-slate-400">{user.companyName}</p>
          </div>

          <nav className="mt-8 space-y-2">
            {PM_MODULES.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-xl border border-transparent px-4 py-3 transition hover:border-cyan-300/40 hover:bg-cyan-300/10"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-100">{item.label}</p>
                  <span className="rounded-full border border-cyan-300/30 px-2 py-0.5 text-[10px] uppercase text-cyan-200">{item.status}</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">{item.description}</p>
              </Link>
            ))}
          </nav>

          <div className="mt-auto rounded-2xl border border-white/10 bg-black/20 p-4 text-xs text-slate-300">
            <p className="font-semibold text-white">{user.fullName}</p>
            <p>{user.role}</p>
            <Link href="/logout" className="mt-3 inline-block text-cyan-200">
              Logout
            </Link>
          </div>
        </aside>
        ) : null}

        
        <div className="flex-1 space-y-4">
          {showNavigation ? (
          <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-white/5 p-2 lg:hidden">
            {PM_MODULES.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-200"
              >
                {item.shortLabel}
              </Link>
            ))}
          </nav>
          ) : null}
          <main className="min-w-0">{children}</main>
        </div>

      </div>
    </div>
  );
}
