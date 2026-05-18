import { openAIProvider } from "@/lib/ai/providers/openai-provider";
import type { InferenceProvider, InferenceRequest, InferenceResponse } from "@/lib/ai/inference/types";
import { InferenceError } from "@/lib/ai/inference/types";

const DEFAULT_MODEL = process.env.DEFAULT_AI_MODEL ?? "gpt-4.1-mini";

// Per-module model overrides; resolved once at startup from env.
const MODULE_MODEL_MAP: Record<string, string> = {
  "meta-intelligence": process.env.OPENAI_META_INTELLIGENCE_MODEL ?? DEFAULT_MODEL,
  "message-nudges": process.env.OPENAI_MESSAGE_NUDGES_MODEL ?? DEFAULT_MODEL,
};

const providerRegistry = new Map<string, InferenceProvider>([
  ["openai", openAIProvider],
  // Future providers registered here:
  // ["anthropic", anthropicProvider],
  // ["gemini", geminiProvider],
  // ["local", localProvider],
]);

export function resolveProvider(moduleId?: string): InferenceProvider {
  // Future: consult module registry or policy engine for per-module routing.
  // For now, route everything through the configured default provider.
  void moduleId;
  const providerId = process.env.DEFAULT_AI_PROVIDER ?? "openai";
  const provider = providerRegistry.get(providerId);
  if (!provider) {
    throw new InferenceError(
      `AI provider "${providerId}" is not registered. Available providers: ${[...providerRegistry.keys()].join(", ")}`,
      "unknown",
      providerId,
    );
  }
  return provider;
}

export function resolveModelForModule(moduleId?: string): string {
  return (moduleId && MODULE_MODEL_MAP[moduleId]) ?? DEFAULT_MODEL;
}

export function registerProvider(provider: InferenceProvider): void {
  providerRegistry.set(provider.id, provider);
}

export async function runInference(request: InferenceRequest): Promise<InferenceResponse> {
  const provider = resolveProvider(request.moduleId);
  // Apply module-default model when caller has not specified an explicit preference.
  const resolvedRequest: InferenceRequest = request.modelPreference
    ? request
    : { ...request, modelPreference: resolveModelForModule(request.moduleId) };
  return provider.complete(resolvedRequest);
}
