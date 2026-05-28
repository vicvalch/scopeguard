/**
 * Lightweight validation script for the PMO onboarding flow.
 * Run: node scripts/validate-pmo-flow.mjs
 */

// ─── 1. Continuation route validation ─────────────────────────────────────────

function isSafeContinuationRoute(route) {
  const BLOCKED_PREFIXES = ["/login", "/signup", "/auth", "/debug", "/api", "/_next"];
  const ALLOWED_PREFIXES = ["/workspace", "/projects", "/dashboard", "/portfolio", "/upload", "/command-center", "/create-pmo"];

  if (typeof route !== "string") return false;
  if (/[\r\n\t]/.test(route)) return false;
  const normalized = route.trim();
  if (!normalized.startsWith("/")) return false;
  if (normalized.startsWith("//")) return false;

  try {
    const parsed = new URL(normalized, "http://localhost");
    if (parsed.origin !== "http://localhost") return false;
    if (BLOCKED_PREFIXES.some((p) => parsed.pathname === p || parsed.pathname.startsWith(`${p}/`))) return false;
    return ALLOWED_PREFIXES.some((p) => parsed.pathname === p || parsed.pathname.startsWith(`${p}/`));
  } catch {
    return false;
  }
}

const continuationTests = [
  ["/create-pmo", true],
  ["/workspace", true],
  ["//evil.com", false],
  ["/login", false],
  ["/api/anything", false],
  ["https://evil.com", false],
  ["/create-pmo?ref=x", true],
  ["/create-pmo\n", false],
];

let passed = 0, failed = 0;
for (const [route, expected] of continuationTests) {
  const result = isSafeContinuationRoute(route);
  if (result === expected) {
    passed++;
  } else {
    console.error(`FAIL: isSafeContinuationRoute(${JSON.stringify(route)}) => ${result}, expected ${expected}`);
    failed++;
  }
}
console.log(`Continuation route validation: ${passed} passed, ${failed} failed`);

// ─── 2. PMO tenant payload validation ─────────────────────────────────────────

function validatePmoTenantPayload(payload) {
  const errors = [];
  if (!payload || typeof payload !== "object") return { ok: false, errors: ["Payload must be an object"] };
  if (!payload.identity?.pmoName?.trim()) errors.push("identity.pmoName is required");
  if (!payload.identity?.organizationName?.trim()) errors.push("identity.organizationName is required");
  if (!payload.identity?.pmoType) errors.push("identity.pmoType is required");
  if (!payload.identity?.operatingModel) errors.push("identity.operatingModel is required");
  if (!payload.vault?.provider) errors.push("vault.provider is required");
  if (!payload.governance?.methodology) errors.push("governance.methodology is required");
  if (!payload.governance?.reportingCadence) errors.push("governance.reportingCadence is required");
  if (!payload.governance?.projectScale) errors.push("governance.projectScale is required");
  if (!payload.governance?.approvalGovernance) errors.push("governance.approvalGovernance is required");
  if (!Array.isArray(payload.agents) || payload.agents.length === 0) errors.push("agents must be a non-empty array");
  if (!payload.createdAt) errors.push("createdAt is required");
  if (!payload.updatedAt) errors.push("updatedAt is required");
  return errors.length ? { ok: false, errors } : { ok: true };
}

const now = new Date().toISOString();
const validTenant = {
  identity: { pmoName: "Test PMO", organizationName: "Acme", pmoType: "enterprise-pmo", operatingModel: "centralized" },
  vault: { provider: "pmfreak-cloud", label: "PMFreak Cloud Vault" },
  governance: { methodology: "agile", reportingCadence: "weekly", projectScale: "mid", approvalGovernance: "structured" },
  agents: [{ agentId: "scope", enabled: true }],
  contextSeed: { strategicObjective: "", deliveryChallenges: [], successDefinition: "" },
  createdAt: now,
  updatedAt: now,
};

const payloadTests = [
  [validTenant, true],
  [{ ...validTenant, identity: { ...validTenant.identity, pmoName: "" } }, false],
  [null, false],
  [{}, false],
];

let p2 = 0, f2 = 0;
for (const [payload, expected] of payloadTests) {
  const result = validatePmoTenantPayload(payload);
  if (result.ok === expected) {
    p2++;
  } else {
    console.error(`FAIL: validatePmoTenantPayload => ok=${result.ok}, expected ok=${expected}`);
    f2++;
  }
}
console.log(`PMO tenant payload validation: ${p2} passed, ${f2} failed`);

// ─── 3. Agent domain mapping ───────────────────────────────────────────────────

const AGENT_TO_DOMAIN = {
  scope: "governance", timeline: "timeline", cost: "financial", quality: "governance",
  resource: "delivery", stakeholder: "stakeholder", "delivery-intelligence": "delivery",
  "executive-synthesis": "general", "portfolio-arbitration": "governance",
};

const agents = [
  { agentId: "scope", enabled: true },
  { agentId: "timeline", enabled: true },
  { agentId: "cost", enabled: false },
  { agentId: "executive-synthesis", enabled: true },
];
const enabledDomains = [...new Set(agents.filter((a) => a.enabled).map((a) => AGENT_TO_DOMAIN[a.agentId] ?? "general"))];
const expectedDomains = ["governance", "timeline", "general"];
const domainMatch = expectedDomains.every((d) => enabledDomains.includes(d)) && enabledDomains.length === expectedDomains.length;
if (domainMatch) {
  console.log("Agent domain mapping: 1 passed, 0 failed");
} else {
  console.error(`FAIL: agent domains => ${JSON.stringify(enabledDomains)}, expected ${JSON.stringify(expectedDomains)}`);
}

// ─── 4. Route policy classification ───────────────────────────────────────────

// Mirrors the TypeScript source in route-policy-registry.ts.
// getRouteAccessPolicy uses priority ordering — setup is checked before workspace-core.
const AUTH_ROUTES_R = ["/login", "/signup"];
const SETUP_ROUTES_R = ["/workspace/setup", "/getting-started", "/onboarding", "/create-pmo"];
const WORKSPACE_CORE_ROUTES_R = ["/workspace", "/copilot", "/projects", "/upload", "/accept-invite"];
const WORKSPACE_CONTEXTUAL_ROUTES_R = ["/dashboard", "/command-center", "/portfolio"];
const PUBLIC_ROUTES_R = ["/", "/pricing", "/forgot-password", "/auth/reset-password", "/auth/callback", "/signup/confirm-email", "/logout"];

function matchesAny(pathname, routes) {
  return routes.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}
function getPolicy(pathname) {
  if (pathname.startsWith("/api")) return "api";
  if (matchesAny(pathname, AUTH_ROUTES_R)) return "auth";
  if (matchesAny(pathname, SETUP_ROUTES_R)) return "setup";
  if (matchesAny(pathname, WORKSPACE_CORE_ROUTES_R)) return "workspace-core";
  if (matchesAny(pathname, WORKSPACE_CONTEXTUAL_ROUTES_R)) return "workspace-contextual";
  if (matchesAny(pathname, PUBLIC_ROUTES_R)) return "public";
  return "unknown";
}
function isSetupRouteCheck(pathname) { return getPolicy(pathname) === "setup"; }
function requiresOnboardingCompletionCheck(pathname) {
  const p = getPolicy(pathname);
  return p === "workspace-core" || p === "workspace-contextual";
}

const policyTests = [
  ["/create-pmo", true, false],   // [route, isSetup, requiresOnboarding]
  ["/workspace", false, true],
  ["/workspace/setup", true, false],
  ["/getting-started", true, false],
  ["/projects", false, true],
];
let p3 = 0, f3 = 0;
for (const [route, expectSetup, expectOnboarding] of policyTests) {
  const setup = isSetupRouteCheck(route);
  const onboarding = requiresOnboardingCompletionCheck(route);
  if (setup === expectSetup && onboarding === expectOnboarding) {
    p3++;
  } else {
    console.error(`FAIL: policy(${route}) => setup=${setup} onboarding=${onboarding}, expected setup=${expectSetup} onboarding=${expectOnboarding}`);
    f3++;
  }
}
console.log(`Route policy classification: ${p3} passed, ${f3} failed`);

// ─── Summary ───────────────────────────────────────────────────────────────────

const totalFailed = failed + f2 + (domainMatch ? 0 : 1) + f3;
if (totalFailed === 0) {
  console.log("\nAll validations passed.");
  process.exit(0);
} else {
  console.error(`\n${totalFailed} validation(s) failed.`);
  process.exit(1);
}
