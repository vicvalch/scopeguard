import { NextResponse } from "next/server";
import { AccessDeniedError } from "@/lib/security/access-guards";
import { logSecurityEvent, type SecurityEventType } from "@/lib/security/telemetry";

type DenyInput = {
  status: 401 | 403 | 404 | 409;
  routeId: string;
  message: string;
  eventType?: SecurityEventType;
  reason: string;
  actorUserId?: string | null;
  actorAgentId?: string | null;
  workspaceId?: string | null;
  projectId?: string | null;
  requestedPermission?: string | null;
  deniedPermission?: string | null;
  actorRole?: string | null;
  metadata?: Record<string, unknown>;
};

export function denyResponse(input: DenyInput) {
  void logSecurityEvent(input.eventType ?? (input.status === 401 ? "auth_denied" : "denied_permission"), {
    routeId: input.routeId,
    actorUserId: input.actorUserId ?? null,
    actorAgentId: input.actorAgentId ?? null,
    workspaceId: input.workspaceId ?? null,
    projectId: input.projectId ?? null,
    requested_permission: input.requestedPermission ?? null,
    denied_permission: input.deniedPermission ?? null,
    actorRole: input.actorRole ?? null,
    metadata: { denial_reason: input.reason, ...(input.metadata ?? {}) },
  });
  return NextResponse.json({ error: input.message }, { status: input.status });
}

export function denyFromAccessError(error: AccessDeniedError, input: Omit<DenyInput, "reason">) {
  return denyResponse({
    ...input,
    reason: String(error.metadata.reason ?? "access_denied"),
    metadata: error.metadata,
  });
}
