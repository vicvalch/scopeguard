import { evaluatePolicyDecision } from "@/lib/security/policy-engine";
export async function POST(request: Request) { const body = await request.json(); const result = await evaluatePolicyDecision(body); return Response.json(result); }
