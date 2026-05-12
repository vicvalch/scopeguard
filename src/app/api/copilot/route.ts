import { getAuthUser, type UserRole } from "@/lib/auth";
import { getCompanySubscription, type SubscriptionPlan } from "@/lib/billing";
import { canUseAdvancedAi, requireFeatureAccess } from "@/lib/feature-gates";
import { canUsePortfolioMemory } from "@/lib/plan-access";
import { buildPmNativeResponse } from "@/lib/pm-response-shaping";
import { readProjectMemory, type StoredProjectAnalysis } from "@/lib/project-memory";
import { getRuntimeAuthorityView } from "@/lib/aoc/runtime-observability";
import { appendOperationalMemory, buildContinuityContext, extractOperationalMemoryCandidates } from "@/lib/operational-memory-v1";
import { enforceGovernanceAction } from "@/lib/security/governance-runtime";
import { consumeExecutionGrant } from "@/lib/security/execution-grants";
import { buildAuthorityLineage, consumeDelegatedCapability, explainDelegationChain } from "@/lib/security/delegated-capabilities";
// verifyAgentAttestation is enforced within governance-runtime for ai.execute actions.
import { denyResponse } from "@/lib/security/deny-response";

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

  if (!payload.message?.trim()) return Response.json({ error: "Message is required." }, { status: 400 });
  if (payload.companyId && payload.companyId !== user.companyId) return denyResponse({ status: 403, routeId: "/api/copilot", message: "Tenant mismatch.", reason: "tenant_mismatch", actorUserId: user.id, eventType: "suspicious_cross_scope_attempt" });
  const agentToken = request.headers.get("x-pmf-agent-token");
  const agentId = request.headers.get("x-pmf-agent-id");
  const workspaceId = request.headers.get("x-pmf-workspace-id");
  if (!agentToken || !agentId || !workspaceId) return denyResponse({ status: 403, routeId: "/api/copilot", message: "Agent attestation required.", reason: "missing_attestation_headers", actorUserId: user.id, eventType: "malformed_attestation" });

  const delegatedCapabilityToken = request.headers.get("x-pmf-delegation-token");
  if (delegatedCapabilityToken) {
    const delegated = await consumeDelegatedCapability({ delegationToken: delegatedCapabilityToken, action: "ai.execute", workspaceId, projectId: payload.projectId?.trim() || null, requestedPermission: "execute_ai_action", resourceType: "copilot", actorUserId: user.id, actorAgentId: agentId });
    if (!delegated.ok) return denyResponse({ status: 403, routeId: "/api/copilot", message: "Invalid delegated capability.", reason: delegated.reason, actorUserId: user.id, actorAgentId: agentId, workspaceId, projectId: payload.projectId?.trim() || null, requestedPermission: "execute_ai_action", deniedPermission: "execute_ai_action", eventType: "delegated_capability_invalid" });
    console.info("[delegation]", explainDelegationChain(buildAuthorityLineage({ parentGrantId: delegated.delegation.parent_grant_id, parentDecisionId: delegated.delegation.parent_decision_id, delegatorUserId: delegated.delegation.delegator_user_id, delegatorAgentId: delegated.delegation.delegator_agent_id, delegateeUserId: delegated.delegation.delegatee_user_id, delegateeAgentId: delegated.delegation.delegatee_agent_id, action: delegated.delegation.action, requestedPermission: delegated.delegation.requested_permission, workspaceId: delegated.delegation.workspace_id, projectId: delegated.delegation.project_id, constraints: delegated.delegation.constraints, expiresAt: delegated.delegation.expires_at, depth: delegated.delegation.constraints?.delegationDepth ?? 0 })));
  } else {
  const executionGrantToken = request.headers.get("x-pmf-execution-grant");
  if (executionGrantToken) {
    const granted = await consumeExecutionGrant({ grantToken: executionGrantToken, action: "ai.execute", workspaceId, projectId: payload.projectId?.trim() || null, requestedPermission: "execute_ai_action", resourceType: "copilot", actorUserId: user.id, actorAgentId: agentId });
    if (!granted.ok) return denyResponse({ status: 403, routeId: "/api/copilot", message: "Invalid execution grant.", reason: granted.reason, actorUserId: user.id, actorAgentId: agentId, workspaceId, projectId: payload.projectId?.trim() || null, requestedPermission: "execute_ai_action", deniedPermission: "execute_ai_action", eventType: "execution_grant_invalid" });
  } else {
    const governance = await enforceGovernanceAction({
      actorType: "ai_agent",
      actorUserId: user.id,
      actorAgentId: agentId,
      workspaceId,
      projectId: payload.projectId?.trim() || undefined,
      action: "ai.execute",
      routeId: "/api/copilot",
      requestedPermission: "execute_ai_action",
      agentToken,
      resourceType: "copilot",
    });
    if (governance.response) return governance.response;
  }}

  const methodology = payload.methodology ?? "Hybrid";
  const subscription = await getCompanySubscription(user.companyId);

  const allMemory = await readProjectMemory(user.companyId);
  const selectedProject = allMemory.find((p) => p.id === payload.projectId) ?? allMemory.find((p) => p.projectName === payload.projectName);
  const allowedMemory = canUsePortfolioMemory(subscription.plan) ? allMemory : selectedProject ? [selectedProject] : [];

  const analysisAccess = await requireFeatureAccess(user.companyId, "ai_analysis");
  if (!analysisAccess.ok) {
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return Response.json({ error: "Missing OPENAI_API_KEY on the server." }, { status: 500 });

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

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: `User role: ${payload.role ?? user.role}\nProject selected: ${payload.projectName ?? selectedProject?.projectName ?? "Not specified"}\nKnown project memory:\n${contextSummary || "No memory available."}\n\nOperational continuity signals:\n${continuitySignals.length ? continuitySignals.map((s) => `- ${s}`).join("\n") : "- No reliable continuity signal extracted."}\n\nPersisted unresolved operational memory:\n${continuity.unresolved.map((item) => `- [${item.memoryType}] ${item.memoryText} (source: ${item.sourceType}:${item.sourceReference})`).join("\n") || "- No unresolved memory yet."}\n\nAOC runtime authority context:\n${JSON.stringify(runtimeContext)}\n\nUser message: ${payload.message}`,
        },
      ],
    }),
  });

  const body = (await response.json()) as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } };
  if (!response.ok) return Response.json({ error: body.error?.message ?? "Copilot failed." }, { status: 502 });

  const content = body.choices?.[0]?.message?.content;
  if (!content) return Response.json({ error: "OpenAI returned empty response." }, { status: 502 });

  let parsed: Partial<CopilotResponse> = {};
  try {
    parsed = JSON.parse(content) as Partial<CopilotResponse>;
  } catch {
    parsed = { answer: content };
  }

  const result: CopilotResponse = {
    answer: buildPmNativeResponse({
      diagnosis: typeof parsed.diagnosis === "string" ? parsed.diagnosis : "Single-thread accountability is missing; decisions are waiting in queue.",
      immediateAction:
        typeof parsed.immediateAction === "string"
          ? parsed.immediateAction
          : "Program lead assigns one accountable owner for the next milestone and publishes due date before end of day.",
      reinforcement:
        typeof parsed.reinforcement === "string"
          ? parsed.reinforcement
          : "Without an owner reset, escalation load and timeline variance both increase this week.",
      nextStep:
        typeof parsed.nextStep === "string"
          ? parsed.nextStep
          : "Within 24 hours, clear shared ownership on active workstreams and confirm dependency handoffs.",
    }),
    diagnosis: typeof parsed.diagnosis === "string" ? parsed.diagnosis : undefined,
    immediateAction: typeof parsed.immediateAction === "string" ? parsed.immediateAction : undefined,
    reinforcement: typeof parsed.reinforcement === "string" ? parsed.reinforcement : undefined,
    nextStep: typeof parsed.nextStep === "string" ? parsed.nextStep : undefined,
    cards: Array.isArray(parsed.cards) ? (parsed.cards.slice(0, 5) as CopilotResponse["cards"]) : [],
    facts: safeList(Array.isArray(parsed.facts) ? parsed.facts : []),
    bestPractices: safeList(Array.isArray(parsed.bestPractices) ? parsed.bestPractices : []),
    assumptions: safeList(Array.isArray(parsed.assumptions) ? parsed.assumptions : []),
    requiresMoreContext: Boolean(parsed.requiresMoreContext),
    contextGapQuestions: safeList(Array.isArray(parsed.contextGapQuestions) ? parsed.contextGapQuestions : []),
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

  return Response.json(result);
  return Response.json({ ...result, runtimeContext });
}
