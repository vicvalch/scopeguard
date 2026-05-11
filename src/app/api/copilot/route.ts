import { getAuthUser, type UserRole } from "@/lib/auth";
import { getCompanySubscription, type SubscriptionPlan } from "@/lib/billing";
import { canUseAdvancedAi, requireFeatureAccess } from "@/lib/feature-gates";
import { canUsePortfolioMemory } from "@/lib/plan-access";
import { readProjectMemory, type StoredProjectAnalysis } from "@/lib/project-memory";
import { getRuntimeAuthorityView } from "@/lib/aoc/runtime-observability";

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

const normalize = (v: string) => v.toLowerCase().trim();

const safeList = (items: string[], limit = 8) => items.map((item) => item.trim()).filter(Boolean).slice(0, limit);
const hasRequiredSections = (answer: string) =>
  ["Diagnosis", "Immediate Action", "Reinforcement", "Optional Next Step"].every((section) => answer.includes(section));

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
  `### 1. Diagnosis\n${diagnosis}\n\n### 2. Immediate Action (CRITICAL)\n${immediateAction}\n\n### 3. Reinforcement (pressure)\n${reinforcement}\n\n### 4. Optional Next Step (only 1)\n${nextStep}`;

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

const createFallbackResponse = (message: string, methodology: CopilotResponse["methodology"]): CopilotResponse => {
  const lower = normalize(message);
  const wantsEmail = lower.includes("email") || lower.includes("follow-up") || lower.includes("follow up");

  return {
    answer: wantsEmail
      ? "I can draft a follow-up email, but I need project details first (client name, current status, requested action, and due date)."
      : "I can help step-by-step. Share project objective, timeline, key stakeholders, current blockers, and latest status so I can recommend the next actions.",
    cards: wantsEmail
      ? [
          {
            type: "Draft Email",
            title: "Client follow-up draft template",
            items: [
              "Subject: [Project Name] | Status Update and Next Steps",
              "Opening: Thank the client and confirm current milestone status.",
              "Body: Summarize progress, open items, and decisions needed.",
              "Close: Request confirmation by a specific date.",
            ],
          },
        ]
      : [
          {
            type: "Next Actions",
            title: "Immediate PMO next steps",
            items: [
              "Confirm scope baseline and acceptance criteria.",
              "Refresh RAID log with owners and due dates.",
              "Validate timeline assumptions and critical dependencies.",
              "Prepare stakeholder status note with asks/decisions.",
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

  const system = `You are PMFreak, an AI Project Manager that forces execution.
You DO NOT give generic advice.
You DO NOT speak like a consultant.
You DO NOT suggest vague improvements.

Your job:
1) Identify the SINGLE most critical execution failure.
2) Translate it into a real-world action the user must take TODAY.
3) Be specific, time-bound, and uncomfortable if needed.
4) Speak with authority. No soft language.

Hard rules:
- Never invent project facts.
- Never use cross-tenant data.
- If context is missing, call out the missing context briefly and still give one concrete action.
- Avoid vague phrases such as "improve communication", "optimize workflow", or "consider defining roles".
- Every action must include WHO acts, WHAT to do, and WHEN to do it.
- Keep it short and punchy.

Output contract:
- Return compact JSON only.
- Return keys: answer, diagnosis, immediateAction, reinforcement, nextStep, facts, bestPractices, assumptions.
- "answer" must use this exact markdown section format:
  ### 1. Diagnosis
  ### 2. Immediate Action (CRITICAL)
  ### 3. Reinforcement (pressure)
  ### 4. Optional Next Step (only 1)
- Keep each section 1-2 short lines.
- Also include arrays for "facts", "bestPractices", and "assumptions".

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
          content: `User role: ${payload.role ?? user.role}\nProject selected: ${payload.projectName ?? selectedProject?.projectName ?? "Not specified"}\nKnown project memory:\n${contextSummary || "No memory available."}\n\nAOC runtime authority context:\n${JSON.stringify(runtimeContext)}\n\nUser message: ${payload.message}`,
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
    answer:
      typeof parsed.answer === "string" && hasRequiredSections(parsed.answer)
        ? parsed.answer
        : buildStructuredAnswer({
            diagnosis:
              typeof parsed.diagnosis === "string"
                ? parsed.diagnosis
                : "You are missing a single execution owner, so decisions stall and delivery drifts.",
            immediateAction:
              typeof parsed.immediateAction === "string"
                ? parsed.immediateAction
                : "You: assign one accountable owner to the next deliverable today, publish the owner and due date in writing before end of day.",
            reinforcement:
              typeof parsed.reinforcement === "string"
                ? parsed.reinforcement
                : "If you don’t lock ownership now, the next deadline will slip for the same reason.",
            nextStep:
              typeof parsed.nextStep === "string"
                ? parsed.nextStep
                : "Within 24 hours, review active tasks and remove every shared owner.",
          }),
    cards: Array.isArray(parsed.cards) ? parsed.cards.slice(0, 5) as CopilotResponse["cards"] : [],
    facts: safeList(Array.isArray(parsed.facts) ? parsed.facts : []),
    bestPractices: safeList(Array.isArray(parsed.bestPractices) ? parsed.bestPractices : []),
    assumptions: safeList(Array.isArray(parsed.assumptions) ? parsed.assumptions : []),
    requiresMoreContext: Boolean(parsed.requiresMoreContext),
    contextGapQuestions: safeList(Array.isArray(parsed.contextGapQuestions) ? parsed.contextGapQuestions : []),
    plan: subscription.plan,
    aiPowered: true,
    methodology,
  };

  return Response.json({ ...result, runtimeContext });
}
