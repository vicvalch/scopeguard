import { getAuthUser, type UserRole } from "@/lib/auth";
import { getCompanySubscription, type SubscriptionPlan } from "@/lib/billing";
import { canUseAdvancedAi, requireFeatureAccess } from "@/lib/feature-gates";
import { canUsePortfolioMemory } from "@/lib/plan-access";
import { buildPmNativeResponse } from "@/lib/pm-response-shaping";
import { readProjectMemory, type StoredProjectAnalysis } from "@/lib/project-memory";
import { getRuntimeAuthorityView } from "@/lib/aoc/runtime-observability";
import { appendOperationalMemory, buildContinuityContext, extractOperationalMemoryCandidates } from "@/lib/operational-memory-v1";
import { AccessDeniedError, requireProjectAccess } from "@/lib/security/access-guards";
import { verifyAgentAttestation } from "@/lib/security/agent-attestation";

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

const buildStructuredAnswer = ({
  diagnosis,
  immediateAction,
  reinforcement,
  nextStep,
}: {
  diagnosis: string;
  immediateAction: string;
  reinforcement: string;
  nextStep: string;
}) =>
  `### Situation\n${diagnosis}\n\n### Escalation logic\n${reinforcement}\n\n### Decision now\n${immediateAction}\n\n### Next 24h\n${nextStep}`;

const getMethodologyGuide = (methodology: CopilotResponse["methodology"]) => {
  switch (methodology) {
    case "PMI":
      return "Use predictive project controls, baselines, RAID log discipline, integrated change control, and formal stage gates.";
    case "Agile":
      return "Use iterative planning, backlog prioritization, sprint cadence, demos, retrospectives, and fast feedback loops.";
    case "General PMO":
      return "Use practical cross-industry PMO guidance with clear governance, stakeholder communication, and risk controls.";
    case "Hybrid":
    default:
      return "Blend predictive governance (RAID, baselines, change control) with adaptive delivery cadence and continuous reprioritization.";
  }
};

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

const createFallbackResponse = (_message: string, methodology: CopilotResponse["methodology"]): CopilotResponse => {
  return {
    answer: buildStructuredAnswer({
      diagnosis: "Signal is incomplete: objective, at-risk milestone, and dependency owners are missing.",
      reinforcement: "Without dependency ownership and escalation trigger, risk remains unmanaged and leadership will escalate on uncertainty.",
      immediateAction: "You: post a single checkpoint update today with milestone status, blocker owner, and escalation threshold by time.",
      nextStep: "Within 24 hours, lock dependency owners and confirm one decision owner for each unresolved risk.",
    }),
    cards: [
      {
        type: "Next Actions",
        title: "Operational minimum input",
        items: [
          "Define objective, phase, and at-risk milestone.",
          "List top dependencies with owner and due date.",
          "State escalation threshold (time or impact).",
          "Name decision owner for each open blocker.",
        ],
      },
    ],
    facts: ["No tenant project memory context was supplied in this prompt."],
    bestPractices: [getMethodologyGuide(methodology)],
    assumptions: ["General PMO template guidance only; project-specific facts are not yet available."],
    requiresMoreContext: true,
    contextGapQuestions: [
      "What is the exact project objective and current phase?",
      "Which milestone is currently at risk?",
      "What client decision or dependency is blocking progress?",
    ],
    plan: "free",
    aiPowered: false,
    methodology,
  };
};

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

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
  if (payload.companyId && payload.companyId !== user.companyId) {
    return Response.json({ error: "Tenant mismatch." }, { status: 403 });
  }
  const agentToken = request.headers.get("x-pmf-agent-token");
  const agentId = request.headers.get("x-pmf-agent-id");
  const workspaceId = request.headers.get("x-pmf-workspace-id");
  if (agentToken || agentId || workspaceId) {
    if (!agentToken || !agentId || !workspaceId) return Response.json({ error: "Incomplete agent attestation headers." }, { status: 400 });
    try {
      await verifyAgentAttestation({ token: agentToken, expectedAgentId: agentId, workspaceId, permission: "read", projectId: payload.projectId?.trim() || undefined });
    } catch (error) {
      if (error instanceof AccessDeniedError) return Response.json({ error: "Agent attestation denied." }, { status: 403 });
      throw error;
    }
  }

  if (payload.projectId?.trim()) {
    try {
      await requireProjectAccess(payload.projectId.trim());
    } catch (error) {
      if (error instanceof AccessDeniedError) {
        console.warn("[security] copilot_project_access_denied", error.metadata);
        return Response.json({ error: "Invalid project context." }, { status: 403 });
      }
      throw error;
    }
  }

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
