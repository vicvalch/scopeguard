import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const user = await requireAuthUser();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("projects").select("id,name").eq("user_id", user.id).order("created_at", { ascending: false });
  return NextResponse.json({ projects: data ?? [] });
}
