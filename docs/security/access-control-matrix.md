# PMFreak Access Control Matrix V3 (Phase 4.1)

| route_id | Classification | Required primitive | Required role/permission | Audit event emitted on deny | RLS status | Agent-safe | Remaining enforcement gaps |
|---|---|---|---|---|---|---|---|
| `api/copilot:POST` | AI-agent-scoped + project-scoped | `requireProjectAccess` (+ `verifyAgentAttestation` when agent headers present) | workspace member + project `read`; agent scope `read` | `project_scope_violation`, `revoked_agent_access`, `suspicious_permission_escalation` | Route-level only for request path | Partial | Needs explicit workspace-role gating for write-like copilot actions |
| `api/copilot/memory:GET` | AI-agent-scoped + project-scoped | `requireProjectAccess` (+ `verifyAgentAttestation` when agent headers present) | workspace member + project `read`; agent scope `read` | `project_scope_violation`, `revoked_agent_access` | Route-level | Partial | Company-based memory backend still used in some internals |
| `api/upload:POST` | project-scoped | `requireProjectAccess` | role with project `read` baseline (upload permission policy not yet split) | `project_scope_violation`, `denied_permission` | Route-level + project FK | No | Should be upgraded to `requireProjectPermission(upload_documents)` |
| `api/operational-memory:*` | project/workspace scoped | `requireProjectAccess` for project reads/writes | workspace member + project `read` | `project_scope_violation` | Route-level | No | Workspace-only branch still relies on company-based query fallback |
| `api/input-hub:*` | project/workspace scoped | `requireProjectAccess` for project branch | workspace member + project `read` | `project_scope_violation` | Route-level | No | Company ID still used for storage backend lookups |
| `api/projects:*` | workspace-scoped / project-scoped | `requireProjectAccess`; membership lookup in list route | workspace member | `workspace_scope_violation`, `project_scope_violation` | Partial RLS + route | No | `api/projects` list should use `requireWorkspaceMembership` explicitly |
| `api/analyze-ai:POST` | project-scoped + billing-feature scoped | `requireProjectAccess` | workspace member + project `read` | `project_scope_violation` | Route-level | No | Still coupled to `companyId` feature gate checks |
| `api/billing/*` | billing-scoped | (in progress) | owner/admin target | `governance_violation` (when wired) | Table-level billing data RLS partial | No | Routes still mostly auth-only; governance primitive missing |
| `api/intelligence/*` | workspace/project scoped | mixed (`requireProjectAccess` missing in some routes) | workspace member | mixed / inconsistent | Mixed | No | Legacy direct `user_id` filters remain in coordination/interventions/stakeholders |
| `api/onboarding`, `api/getting-started` | authenticated/workspace bootstrap | auth only + implicit insert path | authenticated user | `auth_denied` | none | No | Must bind created records to explicit workspace guard |

## Security event persistence status

- `security_events` now exists as a persistent audit table and receives writes from `logSecurityEvent`.  
- Workspace owner/admin read access is enforced via RLS; anon/authenticated client inserts are revoked.  
- Server/service role insertion is permitted (no client-side arbitrary insert policy).  
- Delete/update are restricted from anon/authenticated roles.
