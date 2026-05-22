import { readFileSync, existsSync } from 'node:fs';

const required = [
  'src/features/trial/metering/domain/metering-types.ts',
  'src/features/trial/metering/services/metering-service.ts',
  'src/features/trial/metering/policies/consumption-policies.ts',
  'src/features/trial/metering/utils/replay-safe.ts',
  'docs/architecture/operational-metering-engine.md',
];
for (const p of required) if (!existsSync(p)) throw new Error(`Missing metering governance path: ${p}`);

const merged = required.map((p) => readFileSync(p, 'utf8').toLowerCase()).join('\n');
for (const forbidden of ['stripe billing', 'invoice', 'openai token cost', 'anthropic token']) {
  if (merged.includes(forbidden)) throw new Error(`Forbidden coupling detected: ${forbidden}`);
}
for (const requiredTerm of ['replaysafehash', 'operationcategory', 'orchestrationintensity', 'deterministic', 'provider']) {
  if (!merged.includes(requiredTerm)) throw new Error(`Missing canonical metering semantic: ${requiredTerm}`);
}

console.log('Operational metering governance check passed.');
