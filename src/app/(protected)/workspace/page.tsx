import { requireAuthUser } from "@/lib/auth";
import { resolveCanonicalWorkspace } from "@/lib/workspaces/canonical-workspace-resolver";
import { WorkspaceShell } from "@/components/pmfreak/workspace/workspace-shell";

export default async function WorkspacePage() {
  const user = await requireAuthUser();
  const resolution = await resolveCanonicalWorkspace(user.id);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <WorkspaceShell
        companyId={user.companyId}
        workspaceId={resolution.workspaceId ?? user.id}
        userId={user.id}
      />
    </main>
  );
}
