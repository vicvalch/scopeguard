"use client";

import type { OperationalMemoryRecord } from "@/lib/operational-memory";

export function OperationalMemoryTable({ records }: { records: OperationalMemoryRecord[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/20">
      <table className="min-w-full text-left text-xs md:text-sm">
        <thead className="border-b border-white/10 text-slate-300">
          <tr>
            <th className="px-3 py-2">Title</th><th className="px-3 py-2">Completion</th><th className="px-3 py-2">Confidence</th><th className="px-3 py-2">Missing prompts</th><th className="px-3 py-2">Facts & source</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.id} className="border-b border-white/5 align-top">
              <td className="px-3 py-2"><p className="font-medium">{r.title}</p><p className="mt-1 text-[11px] uppercase text-cyan-200">{r.domain.replaceAll("_", " ")}</p></td>
              <td className="px-3 py-2">{r.completionScore}%</td>
              <td className="px-3 py-2">{r.confidenceScore}%</td>
              <td className="px-3 py-2">{r.missingFields.slice(0, 4).join(", ") || "None"}</td>
              <td className="px-3 py-2">
                <p>{r.extractedFacts.slice(0, 2).join(" · ") || "No extracted facts yet"}</p>
                <p className="mt-1 text-[11px] text-slate-400">{r.sourceTrace[0]?.sourceType ?? "chat"}: {r.sourceTrace[0]?.sourceRef ?? "n/a"}</p>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
