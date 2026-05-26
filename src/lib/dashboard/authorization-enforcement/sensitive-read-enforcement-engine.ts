import { buildDashboardAuthorizationContext, evaluateAuthorizationCapability } from '../role-authorization/index.ts'
import { enforceDashboardCapabilities } from './capability-enforcement-engine.ts'
import type { DashboardAuthorizationActor, DashboardAuthorizationCapability } from '../role-authorization/index.ts'
import type { DashboardApprovalQueueCard } from '../approval-queue-ui/index.ts'
import type { DashboardTaskLifecycleRecord } from '../task-lifecycle/index.ts'
import type { DashboardAuthorizationEnforcementResult, DashboardScopeContext } from './types.ts'

function requiredSensitiveCaps (actor: DashboardAuthorizationActor | undefined, card?: DashboardApprovalQueueCard, lifecycle?: DashboardTaskLifecycleRecord): DashboardAuthorizationCapability[] {
  if (!actor) return ['view_queue_item']
  const context = buildDashboardAuthorizationContext({ actor, card, lifecycle })
  return context.sensitiveType === 'none' ? ['view_queue_item'] : ['view_queue_item', 'view_sensitive_item']
}

export function enforceSensitiveDashboardRead ({ actor, card, lifecycle, scope }: { actor?: DashboardAuthorizationActor; card?: DashboardApprovalQueueCard; lifecycle?: DashboardTaskLifecycleRecord; scope?: DashboardScopeContext }): DashboardAuthorizationEnforcementResult {
  return enforceDashboardCapabilities({ actor, card, lifecycle, scope, resourceType: 'sensitive_read', requiredCapabilities: requiredSensitiveCaps(actor, card, lifecycle) })
}

export function enforceAuditTrailRead ({ actor, card, lifecycle, scope }: { actor?: DashboardAuthorizationActor; card?: DashboardApprovalQueueCard; lifecycle?: DashboardTaskLifecycleRecord; scope?: DashboardScopeContext }): DashboardAuthorizationEnforcementResult {
  const caps: DashboardAuthorizationCapability[] = ['view_audit_trail']
  if (actor) {
    const context = buildDashboardAuthorizationContext({ actor, card, lifecycle })
    const sensitive = evaluateAuthorizationCapability({ capability: 'view_sensitive_item', context })
    if (context.sensitiveType !== 'none' && !sensitive.allowed) caps.push('view_sensitive_item')
    else if (context.sensitiveType !== 'none') caps.push('view_sensitive_item')
  }
  return enforceDashboardCapabilities({ actor, card, lifecycle, scope, resourceType: 'audit_trail', requiredCapabilities: caps })
}
