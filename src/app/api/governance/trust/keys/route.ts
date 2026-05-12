import { createPrivilegedSupabaseClient } from "@/lib/security/privileged-access";
import { logSecurityEvent } from "@/lib/security/telemetry";

export async function GET() {
  const supabase = createPrivilegedSupabaseClient({ routeId: "api.governance.trust.keys", operation: "read_trust_keys", reason: "external_verifier_discovery" });
  const { data } = await supabase.from("capability_signing_keys").select("key_id,algorithm,status,valid_from,valid_until,public_metadata,capability_trust_domains(domain_key,verification_mode)");
  const keys = (data ?? []).map((k: any) => ({ trustDomain: k.capability_trust_domains?.domain_key ?? null, keyId: k.key_id, algorithm: k.algorithm, status: k.status, validFrom: k.valid_from, validUntil: k.valid_until, verificationMode: k.capability_trust_domains?.verification_mode ?? null, publicMetadata: k.public_metadata ?? {} }));
  await logSecurityEvent("trust_keys_requested", { metadata: { keyCount: keys.length } });
  return Response.json({ note: "HMAC symmetric key material is never exposed. External verification currently requires shared trust or PMFreak server-side verification.", asymmetricVerification: "future_work", keys });
}
