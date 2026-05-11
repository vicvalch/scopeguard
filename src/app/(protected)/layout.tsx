import { requireAuthUser } from "@/lib/auth";
import { OperationalShell } from "@/components/pmfreak/operational-shell";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuthUser();
  if (!user.onboardingCompleted) {
    return <div className="min-h-screen bg-white text-white"><main className="mx-auto max-w-4xl px-5 py-10">{children}</main></div>;
  }

  return <OperationalShell user={{ fullName: user.fullName, role: user.role, companyName: user.companyName }}>{children}</OperationalShell>;
}
