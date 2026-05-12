import { revokeTrustHandshake } from "@/lib/security/trust-handshakes";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const body = await request.json().catch(() => ({}));
  const { id } = await params;
  const handshake = await revokeTrustHandshake({ id, revokerUserId: body.revokerUserId ?? null, reason: body.reason });
  return Response.json({ status: handshake.status, revokedAt: handshake.revoked_at });
}
