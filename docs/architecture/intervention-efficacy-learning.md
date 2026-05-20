# Intervention Efficacy Learning

Deterministic backend layer that learns which intervention categories **appear** to help recurring patterns under tenant/project scope.

## Scope
- Detect intervention-like actions from evidence-backed nutrients.
- Link interventions to learned patterns with workspace/project isolation.
- Infer conservative outcomes (`helped`, `failed`, `worsened`, `stalled`, `inconclusive`, `pending`, `recovered`).
- Score efficacy (0-100) and confidence (0-1).
- Detect intervention fatigue loops and escalation-shift candidates.

## Deterministic detection
Rule patterns map nutrient summary/evidence excerpts into intervention types (follow-up, escalation, technical session, approval request, vendor coordination, customer/internal alignment, risk acceptance, governance clarification, logistics push, financial escalation, recovery action).

## Pattern linking
Linking requires same workspace, same project (or explicit workspace scoped null project), and intervention-to-pattern theme compatibility.

## Outcome inference
Post-attempt signals are evaluated conservatively:
- recovery without renewed escalation => helped/recovered
- escalating pressure after attempt => worsened
- recurring blocker/dependency with no recovery => failed
- mixed recovery + escalation => inconclusive
- insufficient post-window evidence => pending
- unchanged active trajectory => stalled

## Efficacy and fatigue
Efficacy combines inferred outcome + recurrence and signal deltas. Fatigue increases on repeated failed/stalled attempts by same type and target, exposing a deterministic recommended intervention shift.

## Persistence model
Current implementation is in-memory/context-first. It is prepared for workspace/project-scoped persistence tables with RLS.

## Explainability
Each intervention stores outcome reasons and evidence references from nutrient lineage excerpts. No LLM scoring, no embeddings, no autonomous execution.

## Limitations
- Correlation-only interpretation; no causality claims.
- Fixed lexical rules; no semantic generalization beyond deterministic patterns.
- Early-stage in-memory persistence path.
