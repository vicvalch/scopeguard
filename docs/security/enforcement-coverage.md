# Enforcement Coverage (Phase 4.4 snapshot)

## Routes migrated in this change set
- `/api/operational-memory` GET/POST now uses `denyResponse`/`denyFromAccessError` for 401/403 protected-path denies.
- `/api/input-hub` GET/POST now uses `denyResponse`/`denyFromAccessError` for 401/403 protected-path denies.
- `/api/copilot/memory` now uses deny helpers for unauthorized, malformed attestation, attestation deny, and project access deny.
- `/api/projects/[id]` now uses deny helpers for unauthorized/project-scope deny.
- `/api/intelligence/{coordination,execution-risk,interventions,operational-live,stakeholders}` now maps AccessDeniedError to deny helper telemetry.

## Remaining ad hoc protected denies (must be migrated)
- `/api/copilot` still contains inline `console.warn("[security]...")` + `Response.json(...403...)` on project access failure.
- `/api/analyze-ai` still returns ad hoc 401 and 403 deny responses.
- `/api/upload` still contains inline security warning for project access deny.
- `/api/{copilot/context,change-detection,runtime/authority,executive-synthesis,portfolio,ai/message-nudges}` still contain ad hoc 401/403 paths.

## Public/auth endpoints intentionally excluded
- None newly excluded in this patch.
