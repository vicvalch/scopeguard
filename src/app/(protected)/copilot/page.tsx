"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ProjectOption = { id: string; projectName: string; uploadDate: string };
type CopilotCard = { type: "Risks" | "Next Actions" | "Draft Email" | "RACI" | "Checklist"; title: string; items: string[] };
type CopilotResponse = { answer: string; cards: CopilotCard[]; plan: "free" | "pro" | "enterprise"; aiPowered: boolean };
type ChatMessage = { role: "user" | "assistant"; text: string; response?: CopilotResponse };

const QUICK_NUDGES = [
  "What changed in stakeholder sentiment this week?",
  "Summarize blockers before tomorrow's client sync.",
  "Draft a calm response to deadline pressure.",
];

export default function CopilotPage() {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [methodology, setMethodology] = useState<"PMI" | "Agile" | "Hybrid" | "General PMO">("Hybrid");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    void fetch("/api/copilot/context")
      .then((r) => r.json())
      .then((d: { projects?: ProjectOption[] }) => setProjects(d.projects ?? []))
      .catch(() => setProjects([]));
  }, []);

  const selectedProject = useMemo(() => projects.find((p) => p.id === selectedProjectId), [projects, selectedProjectId]);

  const send = async (preset?: string) => {
    const message = (preset ?? input).trim();
    if (!message || loading) return;

    setError(null);
    setMessages((p) => [...p, { role: "user", text: message }]);
    setInput("");
    setLoading(true);
    try {
      const response = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          projectId: selectedProject?.id,
          projectName: selectedProject?.projectName,
          methodology,
        }),
      });
      const payload = (await response.json()) as CopilotResponse & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to get PMFreak Copilot response.");
      setMessages((p) => [...p, { role: "assistant", text: payload.answer, response: payload }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to get PMFreak Copilot response.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const names = Array.from(files).map((file) => file.name);
    setUploadedFiles((prev) => [...names, ...prev].slice(0, 6));

    for (const file of Array.from(files)) {
      const body = new FormData();
      body.append("file", file);
      if (selectedProject?.id) body.append("projectId", selectedProject.id);
      try {
        const response = await fetch("/api/upload", { method: "POST", body });
        if (!response.ok) throw new Error("Upload failed");
      } catch {
        setError(`Could not upload ${file.name}. Please try again.`);
      }
    }
  };

  return (
    <div className="min-h-[80vh]">
      <main className="mx-auto grid w-full gap-4 xl:grid-cols-[1fr_280px]">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-4 md:p-6">
          <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">PMFreak Copilot</p>
              <h1 className="mt-1 text-2xl font-semibold">Chat is your command center</h1>
              <p className="mt-1 text-sm text-slate-300">Talk naturally. PMFreak keeps project memory, timeline pressure, and stakeholder context in the background.</p>
            </div>
            <div className="flex gap-2">
              <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)} className="rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-xs">
                <option value="">All projects</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.projectName}</option>)}
              </select>
              <select value={methodology} onChange={(e) => setMethodology(e.target.value as never)} className="rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-xs">
                <option>Hybrid</option><option>PMI</option><option>Agile</option><option>General PMO</option>
              </select>
            </div>
          </header>

          <div className="mb-3 flex flex-wrap gap-2">
            {QUICK_NUDGES.map((prompt) => <button key={prompt} onClick={() => void send(prompt)} className="rounded-full border border-white/20 px-3 py-1 text-xs text-slate-200 hover:border-cyan-300/40 hover:bg-cyan-300/10">{prompt}</button>)}
          </div>

          <div
            onDrop={(e) => { e.preventDefault(); setDragActive(false); void handleUpload(e.dataTransfer.files); }}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            className={`min-h-[520px] rounded-2xl border p-4 transition ${dragActive ? "border-cyan-300/50 bg-cyan-400/5" : "border-white/10 bg-black/20"}`}
          >
            <div className="space-y-3">
              {messages.length === 0 ? <p className="text-sm text-slate-300">Start with a natural update, like “The client is pressuring us again.”</p> : null}
              {messages.map((msg, i) => (
                <article key={i} className={`max-w-3xl rounded-2xl p-3 text-sm ${msg.role === "user" ? "ml-auto bg-cyan-500/20" : "bg-slate-800/70"}`}>
                  <p>{msg.text}</p>
                </article>
              ))}
              {loading ? <p className="text-sm text-slate-300">Thinking…</p> : null}
              {error ? <p className="text-sm text-rose-200">{error}</p> : null}
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => void handleUpload(e.target.files)} />
            <div className="flex gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Message PMFreak…" className="flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm" />
              <button onClick={() => void send()} disabled={loading} className="rounded-xl border border-cyan-300/50 px-4 py-2 text-sm font-semibold">Send</button>
            </div>
            <button onClick={() => fileInputRef.current?.click()} className="text-xs text-cyan-200">+ Drop or attach project files to enrich context</button>
          </div>
        </section>

        <aside className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-200">Ambient context</h2>
          <article className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-200"><p className="text-cyan-200">Detected blockers</p><p className="mt-1 text-slate-300">Delivery timeline pressure rising for active client workstream.</p></article>
          <article className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-200"><p className="text-cyan-200">Stakeholder signals</p><p className="mt-1 text-slate-300">Legal + finance dependencies are unresolved across current milestones.</p></article>
          <article className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-200"><p className="text-cyan-200">Recent uploads</p><ul className="mt-1 list-disc pl-4 text-slate-300">{uploadedFiles.length ? uploadedFiles.map((name) => <li key={name}>{name}</li>) : <li>No files yet. Drop docs into chat.</li>}</ul></article>
        </aside>
      </main>
    </div>
  );
}
