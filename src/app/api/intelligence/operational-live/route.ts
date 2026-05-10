import { getAuthUser } from "@/lib/auth";
import { buildMockOperationalIntelligence } from "@/lib/operational-intelligence";

export async function GET(request: Request) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId")?.trim() ?? "";

  const operational = buildMockOperationalIntelligence(projectId || null);

  return Response.json({ mode: "live_telemetry_mock", generatedAt: new Date().toISOString(), projectId: projectId || null, ...operational });
}
