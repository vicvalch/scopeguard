import { approveTrustHandshake } from "@/lib/security/trust-handshakes";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  const handshake = await approveTrustHandshake({ id: params.id, approverUserId: body.approverUserId ?? null });
  return Response.json({ status: handshake.status, approvedAt: handshake.approved_at });
}
