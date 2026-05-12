import { createPrivilegedSupabaseClient } from "@/lib/security/privileged-access";
import { logSecurityEvent } from "@/lib/security/telemetry";

export type TrustDomainStatus = "active" | "suspended" | "revoked";
export type VerificationMode = "local" | "trusted_external" | "federation_ready";
export type SigningKeyStatus = "active" | "rotated" | "revoked";

export async function registerTrustDomain(input: { domainKey: string; name: string; issuerApp: string; workspaceId?: string | null; verificationMode?: VerificationMode }) {
  const supabase = createPrivilegedSupabaseClient({ routeId: "security.trust_domains", operation: "register_trust_domain", reason: "federated_capability_verification" });
  const now = new Date().toISOString();
  const { data, error } = await supabase.from("capability_trust_domains").insert({ domain_key: input.domainKey, name: input.name, issuer_app: input.issuerApp, workspace_id: input.workspaceId ?? null, status: "active", verification_mode: input.verificationMode ?? "local", created_at: now, updated_at: now }).select("*").single();
  if (error) throw error;
  await logSecurityEvent("trust_domain_registered", { workspaceId: data.workspace_id ?? null, metadata: { trustDomain: data.domain_key, issuerApp: data.issuer_app, reason: "registered" } });
  return data;
}

export async function getTrustDomain(domainKey: string) { const supabase = createPrivilegedSupabaseClient({ routeId: "security.trust_domains", operation: "get_trust_domain", reason: "verify_capability_claim" }); const { data } = await supabase.from("capability_trust_domains").select("*").eq("domain_key", domainKey).maybeSingle(); return data; }

export async function getActiveSigningKey(domainKey: string) {
  const supabase = createPrivilegedSupabaseClient({ routeId: "security.trust_domains", operation: "get_active_signing_key", reason: "issue_capability_claim" });
  const trustDomain = await getTrustDomain(domainKey);
  if (!trustDomain) return null;
  const { data } = await supabase.from("capability_signing_keys").select("*").eq("trust_domain_id", trustDomain.id).eq("status", "active").order("valid_from", { ascending: false }).limit(1).maybeSingle();
  return data;
}

export async function rotateSigningKey(input: { domainKey: string; keyId: string; algorithm: string; publicMetadata?: Record<string, unknown>; secretRef?: string | null; validFrom?: string }) {
  const supabase = createPrivilegedSupabaseClient({ routeId: "security.trust_domains", operation: "rotate_signing_key", reason: "key_rotation" });
  const trustDomain = await getTrustDomain(input.domainKey);
  if (!trustDomain) throw new Error("missing_trust_domain");
  const now = new Date().toISOString();
  await supabase.from("capability_signing_keys").update({ status: "rotated", valid_until: now }).eq("trust_domain_id", trustDomain.id).eq("status", "active");
  const { data, error } = await supabase.from("capability_signing_keys").insert({ trust_domain_id: trustDomain.id, key_id: input.keyId, algorithm: input.algorithm, status: "active", public_metadata: input.publicMetadata ?? {}, secret_ref: input.secretRef ?? null, valid_from: input.validFrom ?? now }).select("*").single();
  if (error) throw error;
  await logSecurityEvent("signing_key_rotated", { workspaceId: trustDomain.workspace_id ?? null, metadata: { trustDomain: trustDomain.domain_key, keyId: data.key_id, issuerApp: trustDomain.issuer_app, reason: "rotated" } });
  return data;
}

export async function revokeSigningKey(input: { domainKey: string; keyId: string }) { const supabase = createPrivilegedSupabaseClient({ routeId: "security.trust_domains", operation: "revoke_signing_key", reason: "key_revocation" }); const trustDomain = await getTrustDomain(input.domainKey); if (!trustDomain) throw new Error("missing_trust_domain"); const now = new Date().toISOString(); const { data } = await supabase.from("capability_signing_keys").update({ status: "revoked", revoked_at: now, valid_until: now }).eq("trust_domain_id", trustDomain.id).eq("key_id", input.keyId).select("*").maybeSingle(); await logSecurityEvent("signing_key_revoked", { workspaceId: trustDomain.workspace_id ?? null, metadata: { trustDomain: trustDomain.domain_key, keyId: input.keyId, issuerApp: trustDomain.issuer_app, reason: "revoked" } }); return data; }

export async function suspendTrustDomain(domainKey: string) { const supabase = createPrivilegedSupabaseClient({ routeId: "security.trust_domains", operation: "suspend_trust_domain", reason: "issuer_suspension" }); const { data } = await supabase.from("capability_trust_domains").update({ status: "suspended", updated_at: new Date().toISOString() }).eq("domain_key", domainKey).select("*").maybeSingle(); await logSecurityEvent("trust_domain_suspended", { workspaceId: data?.workspace_id ?? null, metadata: { trustDomain: domainKey, keyId: null, issuerApp: data?.issuer_app ?? null, reason: "suspended" } }); return data; }
export async function revokeTrustDomain(domainKey: string) { const supabase = createPrivilegedSupabaseClient({ routeId: "security.trust_domains", operation: "revoke_trust_domain", reason: "issuer_revocation" }); const now = new Date().toISOString(); const { data } = await supabase.from("capability_trust_domains").update({ status: "revoked", revoked_at: now, updated_at: now }).eq("domain_key", domainKey).select("*").maybeSingle(); await logSecurityEvent("trust_domain_revoked", { workspaceId: data?.workspace_id ?? null, metadata: { trustDomain: domainKey, keyId: null, issuerApp: data?.issuer_app ?? null, reason: "revoked" } }); return data; }

export async function verifyIssuerTrust(input: { trustDomain: string; issuerApp: string; expectedTrustDomain?: string }) { const td = await getTrustDomain(input.trustDomain); if (!td) return { ok: false, reason: "missing_trust_domain", trustDomain: null, federationMode: null }; if (input.expectedTrustDomain && input.expectedTrustDomain !== td.domain_key) return { ok: false, reason: "unexpected_trust_domain", trustDomain: td, federationMode: td.verification_mode }; if (td.status !== "active") return { ok: false, reason: `trust_domain_${td.status}`, trustDomain: td, federationMode: td.verification_mode }; if (td.issuer_app !== input.issuerApp) return { ok: false, reason: "untrusted_issuer_app", trustDomain: td, federationMode: td.verification_mode }; return { ok: true, reason: "issuer_trusted", trustDomain: td, federationMode: td.verification_mode }; }

export async function resolveVerificationKey(input: { trustDomainId: string; keyId: string }) { const supabase = createPrivilegedSupabaseClient({ routeId: "security.trust_domains", operation: "resolve_verification_key", reason: "verify_capability_claim" }); const { data } = await supabase.from("capability_signing_keys").select("*").eq("trust_domain_id", input.trustDomainId).eq("key_id", input.keyId).maybeSingle(); return data; }

export async function createVerifierPolicy(input: { workspaceId: string; allowedTrustDomainId: string; allowedIssuerApp: string; allowedActions?: string[]; allowedResourceTypes?: string[] }) { const supabase = createPrivilegedSupabaseClient({ routeId: "security.trust_domains", operation: "create_verifier_policy", reason: "verifier_trust_policy" }); const { data, error } = await supabase.from("capability_verifier_policies").insert({ workspace_id: input.workspaceId, allowed_trust_domain_id: input.allowedTrustDomainId, allowed_issuer_app: input.allowedIssuerApp, allowed_actions: input.allowedActions ?? null, allowed_resource_types: input.allowedResourceTypes ?? null, status: "active" }).select("*").single(); if (error) throw error; await logSecurityEvent("verifier_policy_created", { workspaceId: input.workspaceId, metadata: { trustDomain: input.allowedTrustDomainId, issuerApp: input.allowedIssuerApp, reason: "created" } }); return data; }
export async function listVerifierPolicies(workspaceId: string) { const supabase = createPrivilegedSupabaseClient({ routeId: "security.trust_domains", operation: "list_verifier_policies", reason: "verifier_trust_policy" }); const { data } = await supabase.from("capability_verifier_policies").select("*").eq("workspace_id", workspaceId).eq("status", "active"); return data ?? []; }
export async function evaluateVerifierPolicy(input: { verifierWorkspaceId: string; trustDomainId: string; issuerApp: string; action?: string; resourceType?: string }) { const policies = await listVerifierPolicies(input.verifierWorkspaceId); const matched = policies.find((p: any) => p.allowed_trust_domain_id === input.trustDomainId && p.allowed_issuer_app === input.issuerApp && (!p.allowed_actions || p.allowed_actions.includes(input.action)) && (!p.allowed_resource_types || p.allowed_resource_types.includes(input.resourceType))); if (matched) return { ok: true, reason: "policy_allowed", policyId: matched.id }; await logSecurityEvent("verifier_policy_denied", { workspaceId: input.verifierWorkspaceId, metadata: { trustDomain: input.trustDomainId, issuerApp: input.issuerApp, reason: "policy_denied" } }); return { ok: false, reason: "policy_denied" }; }
