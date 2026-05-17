import { ensurePmfreakAocAdaptersRegistered } from "@/lib/aoc/bootstrap";
import {
  generateExecutionGrantToken,
  issueExecutionGrant as _issueExecutionGrant,
  validateExecutionGrant as _validateExecutionGrant,
  consumeExecutionGrant as _consumeExecutionGrant,
} from "@/aoc/enterprise/runtime/execution-grants";

export { generateExecutionGrantToken };

export async function issueExecutionGrant(...args: Parameters<typeof _issueExecutionGrant>) {
  ensurePmfreakAocAdaptersRegistered();
  return _issueExecutionGrant(...args);
}

export async function validateExecutionGrant(...args: Parameters<typeof _validateExecutionGrant>) {
  ensurePmfreakAocAdaptersRegistered();
  return _validateExecutionGrant(...args);
}

export async function consumeExecutionGrant(...args: Parameters<typeof _consumeExecutionGrant>) {
  ensurePmfreakAocAdaptersRegistered();
  return _consumeExecutionGrant(...args);
}
