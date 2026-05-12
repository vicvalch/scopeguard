import { approveTrustHandshake } from "@/lib/security/trust-handshakes";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const body = await request.json().catch(() => ({}));
  const { id } = await params;
  const handshake = await approveTrustHandshake({ id, approverUserId: body.approverUserId ?? null });
  return Response.json({ status: handshake.status, approvedAt: handshake.approved_at });
}
