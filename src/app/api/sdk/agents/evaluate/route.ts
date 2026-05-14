import { evaluateAgentAccess } from "@/lib/security/agent-access";
export async function POST(request: Request) { const body = await request.json(); const result = await evaluateAgentAccess(body); return Response.json(result); }
