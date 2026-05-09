import { getAuthUser } from "@/lib/auth";
import { readProjectMemory } from "@/lib/project-memory";
import { requireFeatureAccess } from "@/lib/feature-gates";

export async function GET() {
  const user = await getAuthUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memoryAccess = await requireFeatureAccess(user.companyId, "organizational_memory");

  if (!memoryAccess.ok) {
    return Response.json({ error: "Portfolio memory is available on PMO plan." }, { status: 403 });
  }

  const projects = await readProjectMemory(user.companyId);

  const list = projects.map((project) => ({
    id: project.id,
    projectName: project.projectName,
    uploadDate: project.uploadDate,
    complexity: project.complexity,
    riskCount: project.risks.length,
    sourceFileNames: project.sourceFileNames,
  }));

  return Response.json({ projects: list });
}
