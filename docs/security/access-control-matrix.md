# PMFreak Access Control Matrix (Phase 2)

| Domain | Entity | Read | Write | Delete | Primitive | Enforcement | Gaps |
|---|---|---|---|---|---|---|---|
| Core tenancy | `workspaces` | workspace member | owner/admin | owner | `requireWorkspaceMembership`, `requireWorkspaceRole` | route + `workspace_memberships` + RLS | fine-grained RBAC still pending |
| Core tenancy | `projects` | workspace member | workspace member | owner/admin (future role policy) | `requireProjectAccess` | route + RLS | role-based delete policy not fully centralized |
| Onboarding/analysis | `onboarding_analyses` | project member | project member | cascade from project/workspace | `requireProjectAccess` | route + FK + NOT NULL + index | `company_id` compatibility column remains |
| Upload intelligence | `project_memories` | project member | project member | cascade from project/workspace | `requireProjectAccess` | route + RLS + FK | no critical gap found |
| Operational memory | `operational_memory_entries` | project member | project member | cascade from project/workspace | `requireProjectAccess` | route + RLS + FK | no critical gap found |
| Team governance | `workspace_memberships` | workspace member | owner/admin | owner/admin | `requireWorkspaceRole` | route + RLS | future external-stakeholder role not present |
| Invitations | `workspace_invitations` | workspace admin views | owner/admin create/update | owner/admin revoke | `requireWorkspaceRole` + invitation token checks | route + relational scoping | `company_id` legacy field still present |
| Billing/limits | `company_subscriptions`, `company_usage` | workspace member (derived) | owner/admin workflow | n/a | feature-gates + server-only mutations | route only | billing tables remain company keyed |
