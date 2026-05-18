# Enterprise Runtime Sovereignty Audit — PMFreak
Date: 2026-05-17

## Scope limitation
Only the PMFreak repository is present in this workspace. `AOC-Enterprise` and `Architects_of_Change_Protocol` are not available as separate repositories, so this audit assesses them through the in-repo staging layers at `src/aoc/enterprise` and `src/aoc/protocol` plus architecture docs.

## Core verdict
PMFreak is **not** cleanly consuming an external enterprise runtime. It still embeds runtime, authz, policy, trust, and audit logic locally, with only partial namespace-layering and shim-based separation.

## Key architectural breaks
1. Protocol layer imports PMFreak runtime security modules (`src/aoc/protocol/contracts/capability-claims.ts` imports `@/lib/security/*`), violating protocol sovereignty.
2. Enterprise runtime modules directly depend on PMFreak auth/access modules (`src/aoc/enterprise/runtime/policy-engine.ts` imports `@/lib/security/server-authorization` and `@/lib/security/access-guards`).
3. PMFreak route handlers and server helpers can call Supabase directly, bypassing a singular runtime enforcement choke point.
4. SDK is mixed contract+implementation and points at PMFreak-local API routes, not a separate enterprise service endpoint.
5. Authorization pipeline is duplicated across RBAC checks, policy checks, and ad hoc guard calls, creating inconsistent enforcement paths.

## Immediate hardening priorities
- Extract protocol contracts into a package with zero PMFreak imports.
- Extract runtime policy/authorization/enforcement into enterprise package/service and make PMFreak consume only client APIs.
- Block direct DB access for governance/capability domains from PMFreak app layer.
- Replace local guard fan-out with single enterprise authorization gateway.
- Enforce import rules in CI for dependency direction.

## Remediation note (2026-05-17)
- Resolved key break #1 by isolating `src/aoc/protocol/contracts/capability-claims.ts` to pure contract artifacts only (types/constants/canonicalization/hash helpers), and moving PMFreak runtime trust/signing/verification integrations into `src/lib/security/capability-claims.ts`.
- Added `tests/protocol-import-boundaries.test.mjs` to assert protocol contracts do not import forbidden PMFreak layers.


## Remediation update (2026-05-18)
- Resolved key break #2 by enforcing enterprise-owned authorization boundaries across `src/aoc/enterprise/**`: enterprise runtime modules now remain free of PMFreak app/lib imports (`@/lib/*`, `@/app/*`, auth/security helpers).
- Added `tests/enterprise-runtime-sovereignty-imports.test.mjs` to statically fail if enterprise runtime layers import PMFreak auth/security or app/lib modules, preventing regression of dependency direction.
- Confirmed portability boundary: PMFreak-specific deny response shaping remains in `src/lib/aoc/enterprise/runtime.ts` (application adapter), while enterprise runtime evaluation/enforcement contracts remain in `src/aoc/enterprise/runtime/**`.

## Runtime consumption transition update (2026-05-18, phase-1 rollout)
- Added a single PMFreak-consumed enterprise authorization entrypoint at `src/lib/aoc/enterprise/authorization.ts` via `authorizeRuntimeAction()`, which delegates orchestration to enterprise runtime and normalizes decision shape for application use.
- Added PMFreak runtime consumer adapter `src/lib/aoc/pmfreak-runtime-consumer.ts` to isolate request shaping (session identity + scope + metadata) from authorization logic.
- Migrated `src/app/api/operational-memory/route.ts` from local `requireProjectPermission()` enforcement to enterprise runtime consumption flow (`buildEnterpriseRuntimeRequest` -> `authorizeRuntimeAction` -> response shaping).
- Began conversion of `src/lib/security/server-authorization.ts:evaluateCapability()` to enterprise runtime delegation, removing direct local policy orchestration from that path.
- Added regression test `tests/runtime-consumer-boundary.test.mjs` to fail if migrated routes regress to local guard/policy ownership.

### Migration map (current)
- **Migrated to enterprise runtime consumer flow:**
  - `src/app/api/operational-memory/route.ts` (GET/POST project-scoped memory reads/writes).
  - `src/lib/security/server-authorization.ts` capability evaluation path.
- **Still local ownership (remaining):**
  - Multiple route handlers under `src/app/api/**` still import `@/lib/security/access-guards`.
  - Several protected server actions under `src/app/(protected)/**/actions.ts` still use local role checks.
  - Legacy `src/lib/security/access-guards.ts` still contains local RBAC + enforcement orchestration.

### Runtime sovereignty status
- Progress estimate: **~38%** complete for authorization ownership migration.
- Main remaining violations: route-level local guard orchestration, mixed policy/RBAC decisioning in app-layer security helpers, and partial bypass of a singular runtime authorization choke point.
