import { rejectTrustHandshake } from "@/lib/security/trust-handshakes";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  const handshake = await rejectTrustHandshake({ id: params.id, rejectorUserId: body.rejectorUserId ?? null, reason: body.reason });
  return Response.json({ status: handshake.status, rejectedAt: handshake.rejected_at });
}
