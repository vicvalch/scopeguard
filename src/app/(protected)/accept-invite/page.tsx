"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AcceptEarlyAccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [workspaceName, setWorkspaceName] = useState("PMFreak Early Access Workspace");
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setStatus("error");
      setMessage("Invite token is missing from this link.");
      return;
    }

    setStatus("saving");
    const response = await fetch("/api/early-access/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteToken: token, workspaceName }),
    });
    const payload = await response.json();

    if (!response.ok) {
      setStatus("error");
      setMessage(payload?.error ?? "Unable to activate invite.");
      return;
    }

    setStatus("done");
    setMessage("Early access activated. Redirecting you to your dashboard...");
    setTimeout(() => router.push("/dashboard"), 900);
  }

  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-sm text-slate-100 md:p-8">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Founder Invite Activation</p>
      <h1 className="mt-2 text-2xl font-semibold">Activate your PMFreak early access</h1>
      <p className="mt-2 text-slate-300">Confirm your workspace name and we’ll activate your 90-day early access trial.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block space-y-2">
          <span className="text-xs uppercase tracking-[0.12em] text-slate-300">Workspace name</span>
          <input value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} className="w-full rounded-xl border border-white/20 bg-black/20 px-3 py-2 text-slate-100" required minLength={3} maxLength={80} />
        </label>
        <button disabled={status === "saving"} className="rounded-full bg-cyan-300 px-5 py-2 font-semibold text-slate-950 disabled:opacity-60">{status === "saving" ? "Activating..." : "Activate early access"}</button>
      </form>

      {message ? <p className={`mt-4 text-sm ${status === "error" ? "text-rose-300" : "text-emerald-300"}`}>{message}</p> : null}
    </div>
  );
}
