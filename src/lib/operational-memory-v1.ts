import { createSupabaseServerClient } from "@/lib/supabase/server";

export const MEMORY_TYPES = [
  "risks",
  "blockers",
  "decisions",
  "stakeholders",
  "action_items",
  "unresolved_questions",
  "dependencies",
  "milestones",
  "escalations",
] as const;

export type MemoryType = (typeof MEMORY_TYPES)[number];
export type MemorySourceType = "upload" | "copilot_message" | "ingestion_summary" | "manual";
export type MemoryStatus = "active" | "resolved";

export type OperationalMemoryEntry = {
  id: string;
  companyId: string;
  projectId: string | null;
  memoryType: MemoryType;
  memoryText: string;
  status: MemoryStatus;
  sourceType: MemorySourceType;
  sourceReference: string;
  createdAt: string;
};

const KEYWORDS: Record<MemoryType, RegExp[]> = {
  risks: [/\brisk\b/i, /may impact/i, /threat/i, /delayed/i],
  blockers: [/\bblocker\b/i, /\bblocked\b/i, /cannot proceed/i],
  decisions: [/\bdecision\b/i, /decided\b/i, /approved\b/i],
  stakeholders: [/stakeholder/i, /sponsor/i, /owner:/i, /vendor/i, /client/i],
  action_items: [/action item/i, /todo/i, /we need to/i, /next step/i],
  unresolved_questions: [/\?/i, /open question/i, /unknown/i, /unclear/i],
  dependencies: [/dependency/i, /depends on/i, /waiting on/i],
  milestones: [/milestone/i, /go-live/i, /deadline/i, /launch/i],
  escalations: [/escalat/i, /executive review/i, /raise to/i],
};

const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, " ").trim();

const cleanLine = (line: string) => line.replace(/^[\-•\d.)\s]+/, "").trim();

export function extractOperationalMemoryCandidates(input: { text: string; sourceType: MemorySourceType; sourceReference: string; }) {
  const lines = input.text
    .split(/\n+/)
    .map(cleanLine)
    .filter((line) => line.length >= 14)
    .slice(0, 120);

  const candidates: Array<{
    memoryType: MemoryType;
    memoryText: string;
    sourceType: MemorySourceType;
    sourceReference: string;
    status: MemoryStatus;
  }> = [];

  for (const line of lines) {
    for (const memoryType of MEMORY_TYPES) {
      if (KEYWORDS[memoryType].some((pattern) => pattern.test(line))) {
        const resolved = /\b(resolved|closed|completed|done)\b/i.test(line);
        candidates.push({
          memoryType,
          memoryText: line.slice(0, 400),
          sourceType: input.sourceType,
          sourceReference: input.sourceReference,
          status: resolved ? "resolved" : "active",
        });
      }
    }
  }

  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = `${candidate.memoryType}:${normalize(candidate.memoryText)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function appendOperationalMemory(input: {
  companyId: string;
  projectId: string | null;
  entries: Array<{ memoryType: MemoryType; memoryText: string; sourceType: MemorySourceType; sourceReference: string; status: MemoryStatus }>;
}) {
  if (input.entries.length === 0) return [];
  const supabase = await createSupabaseServerClient();

  const incomingTexts = input.entries.map((item) => item.memoryText);
  const { data: existing } = await supabase
    .from("operational_memory_entries")
    .select("memory_type, memory_text")
    .eq("company_id", input.companyId)
    .eq("project_id", input.projectId)
    .in("memory_text", incomingTexts);

  const existingKeys = new Set((existing ?? []).map((row) => `${row.memory_type}:${normalize(row.memory_text)}`));

  const rows = input.entries
    .filter((entry) => !existingKeys.has(`${entry.memoryType}:${normalize(entry.memoryText)}`))
    .map((entry) => ({
      company_id: input.companyId,
      project_id: input.projectId,
      memory_type: entry.memoryType,
      memory_text: entry.memoryText,
      status: entry.status,
      source_type: entry.sourceType,
      source_reference: entry.sourceReference,
    }));

  if (rows.length === 0) return [];

  const { data, error } = await supabase
    .from("operational_memory_entries")
    .insert(rows)
    .select("id, company_id, project_id, memory_type, memory_text, status, source_type, source_reference, created_at");

  if (error) throw new Error(`Unable to persist operational memory entries: ${error.message}`);
  return (data ?? []).map(mapRow);
}

type OperationalMemoryRow = { id: string; company_id: string; project_id: string | null; memory_type: MemoryType; memory_text: string; status: MemoryStatus; source_type: MemorySourceType; source_reference: string; created_at: string; };

const mapRow = (row: OperationalMemoryRow): OperationalMemoryEntry => ({
  id: row.id,
  companyId: row.company_id,
  projectId: row.project_id,
  memoryType: row.memory_type,
  memoryText: row.memory_text,
  status: row.status,
  sourceType: row.source_type,
  sourceReference: row.source_reference,
  createdAt: row.created_at,
});

export async function getOperationalMemory(input: {
  companyId: string;
  projectId: string | null;
  memoryTypes?: MemoryType[];
  unresolvedOnly?: boolean;
  limit?: number;
}) {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("operational_memory_entries")
    .select("id, company_id, project_id, memory_type, memory_text, status, source_type, source_reference, created_at")
    .eq("company_id", input.companyId)
    .eq("project_id", input.projectId)
    .order("created_at", { ascending: false })
    .limit(input.limit ?? 40);

  if (input.memoryTypes?.length) query = query.in("memory_type", input.memoryTypes);
  if (input.unresolvedOnly) query = query.eq("status", "active");

  const { data, error } = await query;
  if (error) throw new Error(`Unable to read operational memory entries: ${error.message}`);
  return (data ?? []).map(mapRow);
}

export async function buildContinuityContext(companyId: string, projectId: string | null) {
  const entries = await getOperationalMemory({ companyId, projectId, unresolvedOnly: true, limit: 30 });
  const grouped = new Map<MemoryType, OperationalMemoryEntry[]>();
  for (const type of MEMORY_TYPES) grouped.set(type, []);

  for (const entry of entries) {
    const bucket = grouped.get(entry.memoryType);
    if (bucket && bucket.length < 3) bucket.push(entry);
  }

  return {
    risks: grouped.get("risks") ?? [],
    blockers: grouped.get("blockers") ?? [],
    decisions: grouped.get("decisions") ?? [],
    stakeholders: grouped.get("stakeholders") ?? [],
    unresolved: entries.slice(0, 8),
  };
}
