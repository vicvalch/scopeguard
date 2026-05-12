import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { acceptEarlyAccessInvite } from "@/lib/early-access";

export async function POST(request: Request) {
  const user = await requireAuthUser();
  const body = await request.json();

  const accepted = await acceptEarlyAccessInvite({
    inviteToken: String(body.inviteToken ?? ""),
    userId: user.id,
    workspaceName: typeof body.workspaceName === "string" ? body.workspaceName : undefined,
  });

  return NextResponse.json(accepted);
}
