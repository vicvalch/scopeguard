import { getAuthUser } from "@/lib/auth";
import { listOperationalMemory, saveOperationalMemory, type OperationalDomain } from "@/lib/operational-memory";

export async function GET(request: Request) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const domain = searchParams.get("domain") as OperationalDomain | null;
  const records = await listOperationalMemory(user.companyId, projectId, domain ?? undefined);
  return Response.json({ records });
}

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as { projectId?: string | null; domain?: OperationalDomain; title?: string; text?: string; sourceRef?: string };
  if (!body.domain || !body.title || !body.text) return Response.json({ error: "domain, title, text required" }, { status: 400 });
  const record = await saveOperationalMemory({ companyId: user.companyId, projectId: body.projectId ?? null, domain: body.domain, title: body.title, text: body.text, sourceRef: body.sourceRef ?? "general-chat" });
  return Response.json({ record }, { status: 201 });
}
