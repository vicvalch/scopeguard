import { requireAuthUser } from "@/lib/auth";
import { resolveCanonicalWorkspace } from "@/lib/workspaces/canonical-workspace-resolver";
import { WorkspaceShell } from "@/components/pmfreak/workspace/workspace-shell";

type WorkspacePageProps = {
  searchParams: Promise<{ onboarded?: string; invited?: string }>;
};

export default async function WorkspacePage({ searchParams }: WorkspacePageProps) {
  const user = await requireAuthUser();
  const resolution = await resolveCanonicalWorkspace(user.id);
  const params = await searchParams;
  const freshOnboarding = params.onboarded === "1";
  const invitedCount = parseInt(params.invited ?? "0", 10) || 0;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <WorkspaceShell
        companyId={user.companyId}
        workspaceId={resolution.workspaceId ?? user.id}
        userId={user.id}
        freshOnboarding={freshOnboarding}
        invitedCount={invitedCount}
      />
    </main>
  );
}
