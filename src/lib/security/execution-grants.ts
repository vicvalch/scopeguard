import { ensurePmfreakAocAdaptersRegistered } from "@/lib/aoc/bootstrap";
import { composeRuntimeContext } from "@/aoc/enterprise/runtime";
import {
  generateExecutionGrantToken,
  issueExecutionGrant as _issueExecutionGrant,
  validateExecutionGrant as _validateExecutionGrant,
  consumeExecutionGrant as _consumeExecutionGrant,
  type ExecutionGrantInput,
} from "@/aoc/enterprise/runtime/execution-grants";

export { generateExecutionGrantToken };
export type { ExecutionGrantInput };

export async function issueExecutionGrant(input: ExecutionGrantInput) {
  ensurePmfreakAocAdaptersRegistered();
  return _issueExecutionGrant(composeRuntimeContext(), input);
}

export async function validateExecutionGrant(input: ExecutionGrantInput) {
  ensurePmfreakAocAdaptersRegistered();
  return _validateExecutionGrant(composeRuntimeContext(), input);
}

export async function consumeExecutionGrant(input: ExecutionGrantInput) {
  ensurePmfreakAocAdaptersRegistered();
  return _consumeExecutionGrant(composeRuntimeContext(), input);
}
