import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { createEarlyAccessInvite } from "@/lib/early-access";

export async function POST(request: Request) {
  const user = await requireAuthUser();
  const body = await request.json();

  const invite = await createEarlyAccessInvite({
    inviteEmail: String(body.inviteEmail ?? ""),
    inviterUserId: user.id,
    inviteNote: typeof body.inviteNote === "string" ? body.inviteNote : undefined,
    requiresApproval: body.requiresApproval === true,
  });

  return NextResponse.json(invite);
}
