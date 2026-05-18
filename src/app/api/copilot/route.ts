import { randomUUID } from "crypto";
import { getAuthUser, type UserRole } from "@/lib/auth";
import { getCompanySubscription, type SubscriptionPlan } from "@/lib/billing";
import { canUseAdvancedAi, requireFeatureAccess } from "@/lib/feature-gates";
import { canUsePortfolioMemory } from "@/lib/plan-access";
import { buildPmNativeResponse } from "@/lib/pm-response-shaping";
import { readProjectMemory, type StoredProjectAnalysis } from "@/lib/project-memory";
import { getRuntimeAuthorityView } from "@/lib/aoc/runtime-observability";
import { appendOperationalMemory, buildContinuityContext, extractOperationalMemoryCandidates } from "@/lib/operational-memory-v1";
import { enforceRuntimeAuthorization } from "@/lib/aoc/enterprise/runtime";
import { consumeExecutionGrant } from "@/lib/security/execution-grants";
import { buildAuthorityLineage, consumeDelegatedCapability, explainDelegationChain } from "@/lib/security/delegated-capabilities";
import { evaluateAgentAccess } from "@/lib/security/agent-access";
// verifyAgentAttestation is enforced within governance-runtime for ai.execute actions.
import { denyResponse } from "@/lib/security/deny-response";
import { verifyAiResponse } from "@/lib/ai/response-verifier";
import { CopilotRequestContract, CopilotResponseContract } from "@/lib/contracts";
import { runInference } from "@/lib/ai/providers/router";
import { InferenceError } from "@/lib/ai/inference/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Resolves the caller's workspace from their project (if given) or first membership.
// Used only on the human-user path where no workspace header is supplied.
async function resolveWorkspaceIdForUser(userId: string, projectId: string | undefined): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  if (projectId) {
    const { data } = await supabase
      .from("projects")
      .select("workspace_id")
      .eq("id", projectId)
      .maybeSingle();
    if (data?.workspace_id) return data.workspace_id as string;
  }
  const { data } = await supabase
    .from("workspace_memberships")
    .select("workspace_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  return (data?.workspace_id as string | undefined) ?? null;
}

type CopilotRequest = {
  message?: string;
  projectId?: string;
  projectName?: string;
  companyId?: string;
  role?: UserRole;
  methodology?: "PMI" | "Agile" | "Hybrid" | "General PMO";
};

type CopilotResponse = {
  answer: string;
  diagnosis?: string;
  immediateAction?: string;
  reinforcement?: string;
  nextStep?: string;
  cards: Array<{ type: "Risks" | "Next Actions" | "Draft Email" | "RACI" | "Checklist"; title: string; items: string[] }>;
  facts: string[];
  bestPractices: string[];
  assumptions: string[];
  requiresMoreContext: boolean;
  contextGapQuestions: string[];
  plan: SubscriptionPlan;
  aiPowered: boolean;
  methodology: "PMI" | "Agile" | "Hybrid" | "General PMO";
};

const safeList = (items: string[], limit = 8) => items.map((item) => item.trim()).filter(Boolean).slice(0, limit);
const hasRequiredSections = (answer: string) =>
  ["Situation", "Escalation logic", "Decision now", "Next 24h"].every((section) => answer.includes(section));
const getMethodologyGuide = (methodology: CopilotResponse["methodology"]) =>
  methodology === "PMI"
    ? "Bias to governance cadence, formal risk controls, and explicit ownership."
    : methodology === "Agile"
      ? "Bias to iterative delivery, backlog clarity, and rapid decision loops."
      : methodology === "General PMO"
        ? "Use neutral PMO language with practical governance and stakeholder framing."
        : "Blend governance rigor with iterative execution pressure and clear escalation boundaries.";

const toOperationalSignals = (runtimeContext: unknown): string[] => {
  if (!runtimeContext || typeof runtimeContext !== "object") return [];

  const signals = new Set<string>();
  const text = JSON.stringify(runtimeContext).toLowerCase();

  if (text.includes("blocker") || text.includes("blocked")) signals.add("blocker recurrence observed in recent operating notes");
  if (text.includes("stakeholder") || text.includes("sponsor")) signals.add("stakeholder alignment signals have shifted since prior checkpoints");
  if (text.includes("escalat")) signals.add("escalation follows a repeating path and should be acknowledged");
  if (text.includes("dependenc")) signals.add("dependency timing drift has prior precedent");
  if (text.includes("decision") || text.includes("approval")) signals.add("prior decision logic should be reused before opening new decision threads");
  if (text.includes("slip") || text.includes("delay") || text.includes("drift")) signals.add("timeline drift trend should be reflected in current risk framing");
  if (text.includes("confidence")) signals.add("confidence trend is evolving and should be stated directionally");

  return Array.from(signals).slice(0, 6);
};


export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return denyResponse({ status: 401, routeId: "/api/copilot", message: "Unauthorized", reason: "unauthorized" });

  const advancedAiAccess = await canUseAdvancedAi(user.id);
  if (!advancedAiAccess.ok) {
    return Response.json(
      { error: advancedAiAccess.error, feature: advancedAiAccess.feature, requiredPlan: advancedAiAccess.requiredPlan },
      { status: 402 },
    );
  }

  let payload: CopilotRequest;
  try {
    payload = (await request.json()) as CopilotRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const requestValidation = CopilotRequestContract(payload);
  if (!requestValidation.ok) {
    console.warn("[contracts] copilot_request_invalid", {
      errors: requestValidation.errors,
      companyId: user.companyId,
    });
    return Response.json({ error: "Invalid request format.", code: "INVALID_REQUEST" }, { status: 400 });
  }
  payload = requestValidation.data as CopilotRequest;

  if (!payload.message?.trim()) return Response.json({ error: "Message is required." }, { status: 400 });
  if (payload.companyId && payload.companyId !== user.companyId) return denyResponse({ status: 403, routeId: "/api/copilot", message: "Tenant mismatch.", reason: "tenant_mismatch", actorUserId: user.id, eventType: "suspicious_cross_scope_attempt" });
  const agentToken = request.headers.get("x-pmf-agent-token");
  const agentId = request.headers.get("x-pmf-agent-id");
  const workspaceIdHeader = request.headers.get("x-pmf-workspace-id");

  // Partial agent headers are malformed — an attacker supplying only some
  // headers must not accidentally fall through to the human-user path.
  const agentHeaderCount = [agentToken, agentId, workspaceIdHeader].filter(Boolean).length;
  if (agentHeaderCount > 0 && agentHeaderCount < 3) {
    return denyResponse({ status: 403, routeId: "/api/copilot", message: "Agent attestation required.", reason: "malformed_attestation", actorUserId: user.id, eventType: "malformed_attestation" });
  }

  const isAgentCall = agentHeaderCount === 3;

  if (isAgentCall) {
    // Agent path: all three headers present — enforce strict attestation and scope.
    const workspaceId = workspaceIdHeader!;
    const agentAuth = await evaluateAgentAccess({ workspaceId, agentId: agentId!, resourceType: "copilot", resourceId: payload.projectId?.trim() || workspaceId, permission: "execute_ai_action" });
    if (agentAuth.decision !== "allow") return denyResponse({ status: 403, routeId: "/api/copilot", message: "Agent scope denied.", reason: `agent_${agentAuth.decision}`, actorUserId: user.id, actorAgentId: agentId, workspaceId, projectId: payload.projectId?.trim() || null, requestedPermission: "execute_ai_action", deniedPermission: "execute_ai_action", eventType: "revoked_agent_access" });

    const delegatedCapabilityToken = request.headers.get("x-pmf-delegation-token");
    if (delegatedCapabilityToken) {
      const delegated = await consumeDelegatedCapability({ delegationToken: delegatedCapabilityToken, action: "ai.execute", workspaceId, projectId: payload.projectId?.trim() || null, requestedPermission: "execute_ai_action", resourceType: "copilot", actorUserId: user.id, actorAgentId: agentId });
      if (!delegated.ok) return denyResponse({ status: 403, routeId: "/api/copilot", message: "Invalid delegated capability.", reason: String(delegated.reason ?? "delegation_denied"), actorUserId: user.id, actorAgentId: agentId, workspaceId, projectId: payload.projectId?.trim() || null, requestedPermission: "execute_ai_action", deniedPermission: "execute_ai_action", eventType: "delegated_capability_invalid" });
      console.info("[delegation]", explainDelegationChain(buildAuthorityLineage({ parentGrantId: delegated.delegation.parent_grant_id, parentDecisionId: delegated.delegation.parent_decision_id, delegatorUserId: delegated.delegation.delegator_user_id, delegatorAgentId: delegated.delegation.delegator_agent_id, delegateeUserId: delegated.delegation.delegatee_user_id, delegateeAgentId: delegated.delegation.delegatee_agent_id, action: delegated.delegation.action, requestedPermission: delegated.delegation.requested_permission, workspaceId: delegated.delegation.workspace_id, projectId: delegated.delegation.project_id, constraints: delegated.delegation.constraints, expiresAt: delegated.delegation.expires_at, depth: delegated.delegation.constraints?.delegationDepth ?? 0 })));
    } else {
      const executionGrantToken = request.headers.get("x-pmf-execution-grant");
      if (executionGrantToken) {
        const granted = await consumeExecutionGrant({ grantToken: executionGrantToken, action: "ai.execute", workspaceId, projectId: payload.projectId?.trim() || null, requestedPermission: "execute_ai_action", resourceType: "copilot", actorUserId: user.id, actorAgentId: agentId });
        if (!granted.ok) return denyResponse({ status: 403, routeId: "/api/copilot", message: "Invalid execution grant.", reason: granted.reason, actorUserId: user.id, actorAgentId: agentId, workspaceId, projectId: payload.projectId?.trim() || null, requestedPermission: "execute_ai_action", deniedPermission: "execute_ai_action", eventType: "execution_grant_invalid" });
      } else {
        const governance = await enforceRuntimeAuthorization({
          actorType: "ai_agent",
          actorUserId: user.id,
          actorAgentId: agentId,
          workspaceId,
          projectId: payload.projectId?.trim() || undefined,
          action: "ai.execute",
          routeId: "/api/copilot",
          requestedPermission: "execute_ai_action",
          agentToken: agentToken!,
          resourceType: "copilot",
        });
        if (governance.response) return governance.response;
      }
    }
  } else {
    // Human user path: no agent headers present. Resolve workspace and enforce governance as user.
    const resolvedWorkspaceId = await resolveWorkspaceIdForUser(user.id, payload.projectId?.trim());
    const governance = await enforceRuntimeAuthorization({
      actorType: "user",
      actorUserId: user.id,
      workspaceId: resolvedWorkspaceId ?? undefined,
      projectId: payload.projectId?.trim() || undefined,
      action: "ai.execute",
      routeId: "/api/copilot",
      requestedPermission: "execute_ai_action",
      resourceType: "copilot",
    });
    if (governance.response) return governance.response;
  }

  const methodology = payload.methodology ?? "Hybrid";
  const subscription = await getCompanySubscription(user.companyId);

  const allMemory = await readProjectMemory(user.companyId);
  const selectedProject = allMemory.find((p) => p.id === payload.projectId) ?? allMemory.find((p) => p.projectName === payload.projectName);
  const allowedMemory = canUsePortfolioMemory(subscription.plan) ? allMemory : selectedProject ? [selectedProject] : [];

  const analysisAccess = await requireFeatureAccess(user.companyId, "ai_analysis");
  if (!analysisAccess.ok) {
  }

  const runtimeContext = await getRuntimeAuthorityView({
    companyId: user.companyId,
    projectId: selectedProject?.id ?? null,
    sourceRef: `user:${user.id}`,
    domain: "operational_memory",
  });

  const contextSummary = allowedMemory
    .slice(0, 6)
    .map((p: StoredProjectAnalysis) => `Project: ${p.projectName}\nRisks: ${p.risks.join("; ") || "none"}\nDependencies: ${p.dependencies.join("; ") || "none"}`)
    .join("\n\n");

  const continuitySignals = toOperationalSignals(runtimeContext);
  const continuity = await buildContinuityContext(user.companyId, selectedProject?.id ?? null);

  const system = `You are PMFreak, an AI Project Manager with operational realism and delivery accountability.
Preserve PM-native operational tone: experienced, calm under pressure, politically aware, delivery-focused.
Do not sound like a template, startup guru, aggressive CEO, or verbose consultant.
Avoid motivational language.

Response shaping goals:
1) Preserve concise operational structure.
2) Keep deterministic reasoning and fact discipline.
3) Vary sentence rhythm and framing between responses.
4) Increase realism in delivery reasoning (dependencies, ownership, sequence, constraints).

Execution behavior:
- Identify the single highest-leverage execution issue first.
- Apply dynamic escalation framing: explain why escalation is or is not warranted now.
- Be dependency-aware: mention critical path or inter-team dependency when relevant.
- Modulate tone by stakeholder impact (team, sponsor, executive, client).
- Calibrate communication style by severity (low, medium, high, critical).
- Adapt phrasing to timeline pressure (same-day, this week, multi-week).
- Articulate tradeoffs concisely.
- Calibrate confidence: explicit confidence level based on evidence strength.
- Sustain operational continuity when evidence exists: use subtle references to recurring blockers, stakeholder continuity, repeated escalation paths, dependency history, prior decisions, timeline drift, confidence evolution, and trend direction.
- Keep continuity references natural and sparse (at most 1-2 short mentions in the full answer).
- Never mention memory systems, cognition architecture, tracking mechanics, or surveillance framing.

Hard rules:
- Never invent project facts.
- Never use cross-tenant data.
- If context is missing, state the missing input briefly and still issue one concrete decision.
- Avoid vague phrases such as "improve communication" or "optimize workflow."
- Every decision/action must include WHO, WHAT, and WHEN.
- Keep output compact and operational.

Output contract:
- Return compact JSON only.
- Return keys: answer, diagnosis, immediateAction, reinforcement, nextStep, facts, bestPractices, assumptions, tradeoffs, dependencies, escalationPath.
- "answer" must use this exact markdown section format:
  ### Situation
  ### Escalation logic
  ### Decision now
  ### Next 24h
- Each section: 1-2 short lines.
- "Escalation logic" should include severity, timeline pressure, and confidence in one tight statement.
- "Decision now" must include one decisive action.
- Also include arrays for "facts", "bestPractices", and "assumptions".
- Keep each section 1-2 short lines.
- Also include arrays for "facts", "bestPractices", "assumptions", "tradeoffs", "dependencies", and "escalationPath".

Methodology mode: ${methodology}. ${getMethodologyGuide(methodology)}`;

  let content: string;
  try {
    const inferenceResult = await runInference({
      moduleId: "copilot",
      workspaceId: isAgentCall ? workspaceIdHeader! : undefined,
      projectId: payload.projectId?.trim() || selectedProject?.id,
      actorId: user.id,
      actorType: isAgentCall ? "ai_agent" : "user",
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: `User role: ${payload.role ?? user.role}\nProject selected: ${payload.projectName ?? selectedProject?.projectName ?? "Not specified"}\nKnown project memory:\n${contextSummary || "No memory available."}\n\nOperational continuity signals:\n${continuitySignals.length ? continuitySignals.map((s) => `- ${s}`).join("\n") : "- No reliable continuity signal extracted."}\n\nPersisted unresolved operational memory:\n${continuity.unresolved.map((item) => `- [${item.memoryType}] ${item.memoryText} (source: ${item.sourceType}:${item.sourceReference})`).join("\n") || "- No unresolved memory yet."}\n\nAOC runtime authority context:\n${JSON.stringify(runtimeContext)}\n\nUser message: ${payload.message}`,
        },
      ],
      responseFormat: { type: "json_object" },
      temperature: 0.2,
      timeoutMs: 25000,
      maxAttempts: 2,
      retryDelayMs: 1000,
      operationName: "copilot",
      idempotencyKey: randomUUID(),
      metadata: { companyId: user.companyId },
    });
    content = inferenceResult.content;
  } catch (error) {
    if (error instanceof InferenceError) {
      console.error("[copilot] inference_failed", {
        errorClass: error.errorClass,
        attempts: error.attempts,
        companyId: user.companyId,
      });
      return Response.json(
        { error: "Copilot temporarily unavailable.", code: error.errorClass },
        { status: error.errorClass === "rate_limited" ? 429 : 502 },
      );
    }
    return Response.json({ error: "Copilot temporarily unavailable." }, { status: 502 });
  }

  if (!content) return Response.json({ error: "AI returned empty response." }, { status: 502 });

  let parsed: Partial<CopilotResponse> = {};
  try {
    parsed = JSON.parse(content) as Partial<CopilotResponse>;
  } catch {
    parsed = { answer: content };
  }

  const responseValidation = CopilotResponseContract(parsed);
  const parsedValidated = responseValidation.ok ? responseValidation.data : {};
  console.info("[contracts] copilot_response_validated", {
    fieldCount: Object.keys(parsedValidated).length,
    companyId: user.companyId,
  });

  const verificationContext = {
    projectName: selectedProject?.projectName ?? payload.projectName ?? null,
    knownRisks: selectedProject?.risks ?? [],
    knownDependencies: selectedProject?.dependencies ?? [],
    unresolvedMemory: continuity.unresolved.map((item) => item.memoryText),
    userMessage: payload.message,
  };

  const verification = verifyAiResponse(parsed, verificationContext);

  console.info("[ai-verifier]", {
    passed: verification.passed,
    confidenceScore: verification.confidenceScore,
    flagCount: verification.flags.length,
    flags: verification.flags.map((f) => ({ field: f.field, rule: f.rule, severity: f.severity })),
    companyId: user.companyId,
    projectId: selectedProject?.id ?? null,
  });

  if (!verification.passed && verification.confidenceScore < 40) {
    console.warn("[ai-verifier] low_confidence_response", {
      confidenceScore: verification.confidenceScore,
      flagCount: verification.flags.length,
      companyId: user.companyId,
      projectId: selectedProject?.id ?? null,
    });
  }

  const verifiedDiagnosis = verification.sanitized.diagnosis ?? (typeof parsedValidated.diagnosis === "string" ? parsedValidated.diagnosis : undefined);
  const verifiedImmediateAction = verification.sanitized.immediateAction ?? (typeof parsedValidated.immediateAction === "string" ? parsedValidated.immediateAction : undefined);

  const result: CopilotResponse = {
    answer: buildPmNativeResponse({
      diagnosis: verifiedDiagnosis ?? "Single-thread accountability is missing; decisions are waiting in queue.",
      immediateAction:
        verifiedImmediateAction ??
        "Program lead assigns one accountable owner for the next milestone and publishes due date before end of day.",
      reinforcement:
        typeof parsedValidated.reinforcement === "string"
          ? parsedValidated.reinforcement
          : "Without an owner reset, escalation load and timeline variance both increase this week.",
      nextStep:
        typeof parsedValidated.nextStep === "string"
          ? parsedValidated.nextStep
          : "Within 24 hours, clear shared ownership on active workstreams and confirm dependency handoffs.",
    }),
    diagnosis: verifiedDiagnosis,
    immediateAction: verifiedImmediateAction,
    reinforcement: typeof parsedValidated.reinforcement === "string" ? parsedValidated.reinforcement : undefined,
    nextStep: typeof parsedValidated.nextStep === "string" ? parsedValidated.nextStep : undefined,
    cards: Array.isArray(parsedValidated.cards) ? (parsedValidated.cards.slice(0, 5) as CopilotResponse["cards"]) : [],
    facts: safeList(verification.sanitized.facts),
    bestPractices: safeList(Array.isArray(parsedValidated.bestPractices) ? parsedValidated.bestPractices : []),
    assumptions: safeList(verification.sanitized.assumptions),
    requiresMoreContext: Boolean(parsedValidated.requiresMoreContext),
    contextGapQuestions: safeList(Array.isArray(parsedValidated.contextGapQuestions) ? parsedValidated.contextGapQuestions : []),
    plan: subscription.plan,
    aiPowered: true,
    methodology,
  };


  const extractedFromMessage = extractOperationalMemoryCandidates({
    text: payload.message,
    sourceType: "copilot_message",
    sourceReference: `copilot:${new Date().toISOString()}`,
  });

  await appendOperationalMemory({
    companyId: user.companyId,
    projectId: selectedProject?.id ?? null,
    entries: extractedFromMessage,
  });

  if (!hasRequiredSections(result.answer)) {
    result.answer = buildPmNativeResponse({
      diagnosis: result.diagnosis ?? "Execution signal quality is insufficient for decision velocity.",
      immediateAction: result.immediateAction ?? "PM assigns accountable owner and due date on top risk item today.",
      reinforcement: result.reinforcement ?? "If governance is delayed again, stakeholder confidence will degrade further.",
      nextStep: result.nextStep ?? "Run a 15-minute dependency review in the next working block.",
    });
  }

  return Response.json({ ...result, verificationScore: verification.confidenceScore });
}
