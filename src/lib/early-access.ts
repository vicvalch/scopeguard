import crypto from "node:crypto";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";

const TRIAL_DAYS = 90;

export type TrialStatus = "pending" | "active" | "expired" | "revoked";

export const hashInviteToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

export const createInviteToken = () => crypto.randomBytes(24).toString("base64url");

export const computeRemainingTrialDays = (trialEndAt: string | null) => {
  if (!trialEndAt) return 0;
  const end = new Date(trialEndAt).getTime();
  const now = Date.now();
  const diff = end - now;
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export async function createEarlyAccessInvite(input: { inviteEmail: string; inviterUserId: string; inviteNote?: string; expiresInDays?: number; requiresApproval?: boolean; }) {
  const supabase = createSupabaseServiceRoleClient({ routeId: "lib.early-access", operation: "service_role_query", reason: "existing_privileged_flow", systemActor: "system" });
  const token = createInviteToken();
  const tokenHash = hashInviteToken(token);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * (input.expiresInDays ?? 14)).toISOString();

  const { data: invite, error: inviteError } = await supabase
    .from("early_access_invites")
    .insert({
      invite_email: input.inviteEmail.toLowerCase(),
      invite_token_hash: tokenHash,
      invite_note: input.inviteNote ?? null,
      inviter_user_id: input.inviterUserId,
      expires_at: expiresAt,
      requires_approval: input.requiresApproval ?? false,
    })
    .select("id, invite_email, expires_at")
    .single();

  if (inviteError || !invite) throw new Error(`Unable to create invite: ${inviteError?.message}`);

  const { error: trialError } = await supabase.from("trial_licenses").insert({ invite_id: invite.id, trial_status: "pending" });
  if (trialError) throw new Error(`Unable to create trial license: ${trialError.message}`);

  await supabase.from("early_access_events").insert({
    invite_id: invite.id,
    event_type: "invite_created",
    event_payload: { inviteEmail: invite.invite_email, expiresAt: invite.expires_at },
  });

  return { inviteId: invite.id, inviteToken: token, expiresAt: invite.expires_at };
}

export async function acceptEarlyAccessInvite(input: { inviteToken: string; userId: string; workspaceName?: string; }) {
  const supabase = createSupabaseServiceRoleClient({ routeId: "lib.early-access", operation: "service_role_query", reason: "existing_privileged_flow", systemActor: "system" });
  const tokenHash = hashInviteToken(input.inviteToken);

  const { data: invite, error } = await supabase
    .from("early_access_invites")
    .select("id, invite_email, expires_at, accepted_at, revoked_at, requires_approval, approved_at")
    .eq("invite_token_hash", tokenHash)
    .maybeSingle();

  if (error) throw new Error(`Unable to validate invite: ${error.message}`);
  if (!invite) throw new Error("Invalid invite token.");
  if (invite.revoked_at) throw new Error("Invite has been revoked.");
  if (invite.accepted_at) throw new Error("Invite has already been used.");
  if (new Date(invite.expires_at).getTime() < Date.now()) throw new Error("Invite has expired.");
  if (invite.requires_approval && !invite.approved_at) throw new Error("Invite is pending founder approval.");

  const workspaceInsert = await supabase
    .from("workspaces")
    .insert({ name: input.workspaceName ?? "PMFreak Early Access Workspace", type: "pmo", owner_user_id: input.userId })
    .select("id")
    .single();
  if (workspaceInsert.error || !workspaceInsert.data) throw new Error(`Unable to create workspace: ${workspaceInsert.error?.message}`);

  const workspaceId = workspaceInsert.data.id as string;

  await supabase.from("workspace_memberships").insert({ workspace_id: workspaceId, user_id: input.userId, role: "owner" });

  const trialStart = new Date();
  const trialEnd = new Date(trialStart.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  const { data: trial, error: trialError } = await supabase
    .from("trial_licenses")
    .update({ workspace_id: workspaceId, trial_start_at: trialStart.toISOString(), trial_end_at: trialEnd.toISOString(), trial_status: "active" })
    .eq("invite_id", invite.id)
    .select("id")
    .single();

  if (trialError || !trial) throw new Error(`Unable to activate trial: ${trialError?.message}`);

  await supabase.from("early_access_invites").update({ accepted_at: new Date().toISOString(), workspace_id: workspaceId }).eq("id", invite.id);

  const activationPayload = {
    runtimeAuthorityVersion: "v1",
    explainabilityMode: "founder-guided",
    machineGovernanceMode: "safety-default",
  };

  const { error: activationError } = await supabase.from("workspace_activations").insert({
    invite_id: invite.id,
    trial_license_id: trial.id,
    workspace_id: workspaceId,
    activated_by_user_id: input.userId,
    operational_memory_namespace: `workspace:${workspaceId}`,
    runtime_authority_linkage: { authority: "workspace_owner", linkedAt: new Date().toISOString() },
    governance_profile: { level: "early_access", profile: "default" },
    explainability_defaults: { style: "high_trust", visibleRationales: true },
    machine_governance_defaults: { escalationMode: "balanced", policyVersion: "2026-05" },
    starter_cognition_state: activationPayload,
  });

  if (activationError) {
    await supabase.from("early_access_events").insert({
      invite_id: invite.id,
      trial_license_id: trial.id,
      workspace_id: workspaceId,
      event_type: "runtime_initialization_failed",
      event_payload: { reason: activationError.message },
    });
    throw new Error(`Runtime initialization failed: ${activationError.message}`);
  }

  await supabase.from("early_access_events").insert([
    { invite_id: invite.id, trial_license_id: trial.id, workspace_id: workspaceId, event_type: "invite_accepted", event_payload: { inviteEmail: invite.invite_email } },
    { invite_id: invite.id, trial_license_id: trial.id, workspace_id: workspaceId, event_type: "workspace_activated", event_payload: activationPayload },
    { invite_id: invite.id, trial_license_id: trial.id, workspace_id: workspaceId, event_type: "workspace_initialized", event_payload: { memoryNamespace: `workspace:${workspaceId}` } },
  ]);

  return { workspaceId, trialEndsAt: trialEnd.toISOString() };
}
