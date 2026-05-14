import { getAuthUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createCapabilityRequest } from "@/lib/security/capability-flow";

export async function GET(request: Request) { const user = await getAuthUser(); if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 }); const workspaceId = new URL(request.url).searchParams.get("workspaceId"); if (!workspaceId) return Response.json({ error: "workspaceId required" }, { status: 400 }); const supabase = await createSupabaseServerClient(); const { data, error } = await supabase.from("capability_requests").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }); if (error) return Response.json({ error: error.message }, { status: 500 }); return Response.json({ requests: data ?? [] }); }
export async function POST(request: Request) { const user = await getAuthUser(); if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 }); const body = await request.json(); const created = await createCapabilityRequest(body); return Response.json({ ok: true, request: created }); }
