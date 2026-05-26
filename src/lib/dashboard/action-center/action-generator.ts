import type { DashboardAction, DashboardActionCenterInput, DashboardActionType } from './types.ts'

const mk = (id: string, type: DashboardActionType, title: string, description: string, source: string, sourceId?: string, signal: Record<string, any> = {}, affectedProjects: string[] = [], rationale = '', evidenceRequired: string[] = []): DashboardAction => ({
  id, type, title, description, priority: 'medium', status: 'proposed', ownerLane: 'project_manager', executionLane: 'portfolio_governance', affectedProjects, source, sourceId, sla: { responseDueHours: 24, resolutionDueHours: 120, cadence: 'Twice weekly follow-up' }, escalationRoute: { required: false }, evidenceRequired, rationale, signal,
})

export function generateDashboardActions(input: DashboardActionCenterInput): DashboardAction[] {
  const actions: DashboardAction[] = []
  const vm = input.dashboardViewModel
  for (const r of vm?.sections?.topRisksTable ?? []) if (['high','critical'].includes(String(r.severity).toLowerCase())) actions.push(mk(`risk-${r.id}`,'resolve_portfolio_risk',r.title,r.rationale ?? `Resolve portfolio risk: ${r.title}`,'dashboard_risk',r.id,{severity:r.severity,hasCriticalAttention:vm?.hasCriticalAttention},r.affectedProjects ?? [],r.rationale ?? '',['Risk rationale','Affected project list','Proposed mitigation','Owner confirmation']))
  for (const i of vm?.sections?.interventionsQueue ?? []) actions.push(mk(`queue-${i.id}`,'execute_pmo_intervention',i.title,`Execute intervention cadence: ${i.cadence}`,'dashboard_intervention_queue',i.id,{urgency:i.urgency,ownerLane:i.ownerLane,hasCriticalAttention:vm?.hasCriticalAttention},i.affectedProjects ?? [],i.title,['Intervention description','Owner lane confirmation','Cadence confirmation','Completion evidence']))
  for (const i of input.pmoInterventionReport?.interventions ?? []) actions.push(mk(`pmo-${i.id}`,'execute_pmo_intervention',i.title,i.rationale ?? `Execute PMO intervention ${i.type}`,'pmo_intervention_report',i.id,{urgency:i.urgency,ownerLane:i.ownerLane},i.affectedProjects ?? [],i.rationale ?? '',i.requiredEvidence?.length ? i.requiredEvidence : ['Intervention description','Owner lane confirmation','Cadence confirmation','Completion evidence']))
  for (const d of vm?.sections?.decisionsWidget ?? []) if (['escalate','reject','approve_with_conditions'].includes(String(d.recommendation).toLowerCase())) actions.push(mk(`decision-${d.id}`,'review_executive_decision',d.title,`Review executive recommendation: ${d.recommendation}`,'dashboard_decision',d.id,{severity:d.severity,recommendation:d.recommendation},[],d.title,['Decision rationale','Confidence score','Impact summary','Executive approval record']))
  for (const a of vm?.sections?.alertPanel ?? []) if (['high','critical'].includes(String(a.severity).toLowerCase())) actions.push(mk(`alert-${a.id}`,'escalate_dashboard_alert',a.title,a.description,'dashboard_alert',a.id,{severity:a.severity},[],a.description,['Alert description','Severity confirmation','Resolution owner','Closeout note']))
  for (const c of input.cacheRefreshResult?.refreshPlan?.actions ?? []) actions.push(mk(`refresh-${c.id}`,'refresh_dashboard_source',c.title,c.description,'cache_refresh_plan',c.id,{refreshPriority:c.priority,severity:c.priority},[],c.reason,['Refresh reason','Source kind','Refresh completion timestamp','Rehydration confirmation']))
  for (const [idx,h] of (input.hydrationResult?.recoveryPlan?.actions ?? []).entries()) actions.push(mk(`hydration-${idx}`,'recover_dashboard_hydration',`Recover hydration: ${h}`,h,'hydration_recovery_plan',String(idx),{hydrationRisk:input.hydrationResult?.riskLevel,severity:input.hydrationResult?.riskLevel},[],h,['Recovery action completed','Source regenerated','Fallback mode cleared','Hydration risk reduced']))

  const warn1 = vm?.warnings ?? []; if (warn1.length <= 10) warn1.forEach((w: string, i: number)=>actions.push(mk(`warn-d-${i}`,'acknowledge_warning',`Acknowledge dashboard warning ${i+1}`,w,'dashboard_warning',String(i),{severity:'warning',warningKind:'operational'},[],w,['Warning acknowledgement','Owner acknowledgement note'])))
  const warn2 = input.cacheRefreshResult?.metadata?.warnings ?? []; if (warn2.length <= 10) warn2.forEach((w: string, i: number)=>actions.push(mk(`warn-c-${i}`,'acknowledge_warning',`Acknowledge cache warning ${i+1}`,w,'cache_metadata_warning',String(i),{severity:'warning',warningKind:'operational'},[],w,['Warning acknowledgement','Owner acknowledgement note'])))

  const extra: DashboardAction[] = []
  for (const a of actions) {
    const text = `${a.title} ${a.rationale}`.toLowerCase()
    if (text.includes('missing input') || text.includes('client input')) extra.push(mk(`${a.id}-missing`,'request_missing_input',`Request missing input for: ${a.title}`,a.description,a.source,a.sourceId,{...a.signal,severity:a.signal?.severity ?? 'high'},a.affectedProjects,a.rationale,['Client input request record','Expected input checklist']))
    if (text.includes('dependency') || text.includes('unblock')) extra.push(mk(`${a.id}-dep`,'resolve_dependency',`Resolve dependency for: ${a.title}`,a.description,a.source,a.sourceId,{...a.signal,severity:a.signal?.severity ?? 'high'},a.affectedProjects,a.rationale,['Dependency map','Unblocker owner confirmation']))
    if (text.includes('financial') || text.includes('budget') || text.includes('po') || text.includes('invoice') || text.includes('payment')) extra.push(mk(`${a.id}-fin`,'review_financial_exposure',`Review financial exposure: ${a.title}`,a.description,a.source,a.sourceId,{...a.signal,severity:a.signal?.severity ?? 'high'},a.affectedProjects,a.rationale,['Budget impact analysis','Finance owner confirmation']))
  }
  const dedup = new Map<string, DashboardAction>()
  for (const a of [...actions, ...extra]) dedup.set(`${a.type}::${a.source}::${a.sourceId ?? ''}::${a.title}`, a)
  return [...dedup.values()]
}
