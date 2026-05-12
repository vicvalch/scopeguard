import { createHmac, timingSafeEqual } from "node:crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AccessDeniedError, requireAgentScope } from "@/lib/security/access-guards";
import { logSecurityEvent } from "@/lib/security/telemetry";
import type { Permission } from "@/lib/security/rbac";

type AgentClaims = { agentId: string; workspaceId: string; exp: number; nonce?: string };

const parseToken = (token: string) => {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) throw new AccessDeniedError("Invalid agent token format.");
  return { encodedPayload, signature };
};

export async function verifyAgentAttestation(input: { token: string; expectedAgentId: string; workspaceId: string; permission: Permission; projectId?: string }) {
  const secret = process.env.PMFREAK_AGENT_TOKEN_SECRET;
  if (!secret) throw new AccessDeniedError("Missing agent attestation secret.");

  const { encodedPayload, signature } = parseToken(input.token);
  const expectedSignature = createHmac("sha256", secret).update(encodedPayload).digest("base64url");
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    void logSecurityEvent("suspicious_permission_escalation", { workspaceId: input.workspaceId, actorAgentId: input.expectedAgentId, routeId: "verifyAgentAttestation", metadata: { reason: "signature_mismatch" } });
    throw new AccessDeniedError("Invalid agent token signature.");
  }

  const claims = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as AgentClaims;
  if (claims.exp * 1000 < Date.now()) throw new AccessDeniedError("Agent token expired.");
  if (claims.workspaceId !== input.workspaceId || claims.agentId !== input.expectedAgentId) {
    throw new AccessDeniedError("Agent token binding mismatch.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: revoked } = await supabase.from("ai_agent_permissions").select("id").eq("workspace_id", input.workspaceId).eq("agent_id", input.expectedAgentId).not("revoked_at", "is", null).limit(1);
  if ((revoked ?? []).length > 0) throw new AccessDeniedError("Agent has been revoked.");

  await requireAgentScope({ workspaceId: input.workspaceId, agentId: input.expectedAgentId, permission: input.permission, projectId: input.projectId });
  return claims;
}
