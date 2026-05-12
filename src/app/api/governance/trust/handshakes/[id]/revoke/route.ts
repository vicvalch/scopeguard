import { revokeTrustHandshake } from "@/lib/security/trust-handshakes";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  const handshake = await revokeTrustHandshake({ id: params.id, revokerUserId: body.revokerUserId ?? null, reason: body.reason });
  return Response.json({ status: handshake.status, revokedAt: handshake.revoked_at });
}
