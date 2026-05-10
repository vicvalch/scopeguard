"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { DOMAIN_FIELDS, OPERATIONAL_DOMAINS, type OperationalDomain, type OperationalMemoryRecord } from "@/lib/operational-memory";
import { OperationalMemoryTable } from "./operational-memory-table";

const fetcher = async <T,>(url: string): Promise<T> => (await fetch(url)).json() as Promise<T>;

export function OperationalMemoryWorkspace() {
  const [domain, setDomain] = useState<OperationalDomain>("stakeholder_intelligence");
  const [text, setText] = useState("");
  const { data, mutate } = useSWR<{ records: OperationalMemoryRecord[] }>(`/api/operational-memory?domain=${domain}`, fetcher);

  const completion = useMemo(() => {
    const scoped = data?.records ?? [];
    if (scoped.length === 0) return 0;
    return Math.round(scoped.reduce((acc, item) => acc + item.completionScore, 0) / scoped.length);
  }, [data?.records]);

  const save = async () => {
    if (!text.trim()) return;
    await fetch("/api/operational-memory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ domain, title: `${domain.replaceAll("_", " ")} update`, text, sourceRef: "copilot-general-chat" }) });
    setText("");
    await mutate();
  };

  return <div className="space-y-4">
    <div className="flex flex-wrap gap-2">{OPERATIONAL_DOMAINS.map((d) => <button key={d} onClick={() => setDomain(d)} className={`rounded-full border px-3 py-1 text-xs ${d === domain ? "border-cyan-300/70 bg-cyan-300/15" : "border-white/20"}`}>{d.replaceAll("_", " ")}</button>)}</div>
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-wide text-cyan-200">{domain.replaceAll("_", " ")} completion meter</p>
      <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-black/40"><div style={{ width: `${completion}%` }} className="h-full bg-cyan-300" /></div>
      <p className="mt-2 text-xs text-slate-300">{completion}% complete. Prompt for missing data: {DOMAIN_FIELDS[domain].filter((f) => f !== "confidence_score").slice(0, 3).join(", ")}.</p>
    </section>
    <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-sm font-semibold">Domain chat ({domain.replaceAll("_", " ")})</p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste updates, decisions, and signals here. PMFreak will extract deterministic structured facts." className="mt-2 min-h-28 w-full rounded-xl border border-white/15 bg-black/40 p-3 text-sm" />
      <button onClick={() => void save()} className="mt-2 rounded-lg border border-cyan-300/40 px-3 py-2 text-sm">Route insight to domain memory</button>
    </section>
    <OperationalMemoryTable records={data?.records ?? []} />
  </div>;
}
