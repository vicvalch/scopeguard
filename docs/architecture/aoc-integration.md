# PMFreak ↔ AOC Integration Boundary

## Current Consumption Mode (May 15, 2026)

PMFreak now consumes AOC surfaces through package names:
- `@aoc/protocol/contracts`
- `@aoc-enterprise/runtime`

These package names are currently linked locally via `file:` dependencies (`src/aoc/protocol` and `src/aoc/enterprise`) so PMFreak behaves as a **vertical consumer** while we keep migration-safe compatibility wrappers.

## Linkage Strategy

- `package.json` uses local package links:
  - `"@aoc/protocol": "file:src/aoc/protocol"`
  - `"@aoc-enterprise/runtime": "file:src/aoc/enterprise"`
- `tsconfig.json` adds temporary path aliases for TypeScript/editor resolution.
- Product code is still required to consume AOC through `src/lib/aoc/*`.

This keeps runtime/build stable now and allows future swap to published/GitHub packages with minimal churn.

## Ownership Boundaries

### PMFreak owns
- PM workflows, UX, business semantics
- product routes and SDK UX contracts

### AOC Protocol owns
- capability/delegation/policy/audit contracts

### AOC Enterprise owns
- authorization evaluation/enforcement pipeline runtime surface

## Integration Boundary in PMFreak

Primary entry points:
- `src/lib/aoc/protocol/types.ts` – thin bridge to `@aoc/protocol/contracts`
- `src/lib/aoc/enterprise/runtime.ts` – thin runtime wrapper over `@aoc-enterprise/runtime`
- `src/lib/aoc/compatibility/*` – temporary payload adapters

## Migrated Vertical Slice

Migrated slice: **governance action enforcement for billing + upload APIs**.

- `src/app/api/billing/create-checkout-session/route.ts` now calls `enforceRuntimeAuthorization` from `src/lib/aoc/enterprise/runtime`.
- `src/app/api/upload/route.ts` now calls `enforceRuntimeAuthorization` from the same boundary.

This bypasses direct product imports from `src/lib/security/governance-runtime` for this slice while preserving behavior.

## Legacy Runtime Quarantine

`src/lib/security/governance-runtime.ts` is explicitly marked as **LEGACY GOVERNANCE RUNTIME** with migration TODO comments. It remains for compatibility while additional routes are migrated.

## Remaining Compatibility Shims

Still active and intentionally retained:
- `src/lib/aoc/compatibility/legacy-policy-map.ts`
- `src/lib/aoc/compatibility/legacy-audit-map.ts`
- `src/lib/aoc/compatibility/legacy-delegation-map.ts`

## Remaining Drift / Debt

1. `Policy` + `Agent` shapes are still local compatibility types in `src/lib/aoc/protocol/types.ts`.
2. Copilot and other routes still import legacy security runtime/services directly.
3. `@aoc-enterprise/runtime` currently wraps existing governance implementation; future step is replacing internals with upstream enterprise package sources.

## Removal Roadmap

1. Continue route-by-route migration to `src/lib/aoc/enterprise/runtime`.
2. Replace remaining compatibility `Policy`/`Agent` with protocol contracts or enterprise-owned representations.
3. Restrict direct imports from `src/lib/security/*` in product layers via lint rules.
4. Swap local `file:` links to published or git-based package refs when multi-repo release flow is finalized.

## Future Publish / Package Strategy

Target progression:
1. Local `file:` links (current)
2. monorepo workspace links
3. git/tag or registry-published `@aoc/*` packages
4. remove TS path alias fallbacks once package publishing is stable
