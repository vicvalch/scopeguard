import { existsSync, readFileSync } from 'node:fs';

const requiredPaths = [
  'src/features/trial/contracts',
  'src/features/trial/domain',
  'src/features/trial/enums',
  'src/features/trial/schemas',
  'src/features/trial/services',
  'src/features/trial/state',
  'src/features/trial/types',
  'src/features/trial/utils',
  'src/features/trial/index.ts',
  'src/features/trial/enums/trial-status.ts',
  'src/features/trial/enums/activation-stage.ts',
  'src/features/trial/enums/upgrade-readiness.ts',
];

const missing = requiredPaths.filter((p) => !existsSync(p));
if (missing.length) {
  console.error('Trial domain foundation check failed: missing required paths:\n' + missing.map((m) => ` - ${m}`).join('\n'));
  process.exit(1);
}

const indexFile = readFileSync('src/features/trial/index.ts', 'utf8');
for (const expected of ['contracts', 'domain', 'enums', 'schemas', 'services', 'state', 'types', 'utils']) {
  if (!indexFile.includes(`./${expected}`) && !indexFile.includes(`/${expected}/`)) {
    console.error(`Trial domain foundation check failed: missing export for ${expected} in index.ts`);
    process.exit(1);
  }
}

const trialTypes = readFileSync('src/features/trial/types/trial-types.ts', 'utf8');
for (const forbidden of ['trial_days_left', 'stripe', 'price_id']) {
  if (trialTypes.toLowerCase().includes(forbidden)) {
    console.error(`Trial domain foundation check failed: forbidden shallow/commercial coupling pattern found (${forbidden}).`);
    process.exit(1);
  }
}

for (const requiredField of ['companyId', 'workspaceId', 'userId', 'status', 'activationStage', 'readiness', 'plan', 'usage', 'credits']) {
  if (!trialTypes.includes(requiredField)) {
    console.error(`Trial domain foundation check failed: missing TrialState field assumption: ${requiredField}`);
    process.exit(1);
  }
}

console.log('Trial domain foundation check passed.');
