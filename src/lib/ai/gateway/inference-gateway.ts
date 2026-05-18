import type { InferenceRequest, InferenceResponse } from "@/lib/ai/inference/types";
import { runProviderInference } from "@/lib/ai/providers/router";

export async function runInferenceGateway(request: InferenceRequest): Promise<InferenceResponse> {
  return runProviderInference(request);
}
