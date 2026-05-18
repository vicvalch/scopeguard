import type { AuthUserContext } from "@/lib/auth";
import type { GovernanceAction, GovernanceEvaluationInput } from "@aoc-enterprise/runtime";

export type PMFreakRuntimeContextInput = {
  user: AuthUserContext;
  action: GovernanceAction;
  routeId: string;
  workspaceId?: string | null;
  projectId?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  actorAgentId?: string | null;
  agentToken?: string | null;
  metadata?: Record<string, unknown>;
};

export function buildEnterpriseRuntimeRequest(input: PMFreakRuntimeContextInput): GovernanceEvaluationInput {
  return {
    actorType: input.actorAgentId ? "ai_agent" : "user",
    actorUserId: input.user.id,
    actorAgentId: input.actorAgentId ?? null,
    workspaceId: input.workspaceId ?? null,
    projectId: input.projectId ?? null,
    resourceType: input.resourceType ?? null,
    resourceId: input.resourceId ?? null,
    action: input.action,
    routeId: input.routeId,
    agentToken: input.agentToken ?? null,
    metadata: {
      source: "pmfreak-runtime-consumer",
      ...(input.metadata ?? {}),
    },
  };
}
