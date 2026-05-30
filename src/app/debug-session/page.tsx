"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase/env";

export default function DebugSessionPage() {
  const [clientSession, setClientSession] = useState<Record<string, unknown> | null>(null);
  const [serverAuth, setServerAuth] = useState<unknown>(null);
  const [cookieDiag, setCookieDiag] = useState<unknown>(null);
  const [cookies, setCookies] = useState("");

  useEffect(() => {
    const run = async () => {
      const { url, anonKey } = getSupabaseEnv();
      const supabase = createBrowserClient(url, anonKey);

      const session = await supabase.auth.getSession();
      setClientSession(session.data.session ? {
        userId: session.data.session.user.id,
        email: session.data.session.user.email,
        expiresAt: session.data.session.expires_at,
      } : null);

      setCookies(document.cookie);

      const [authRes, diagRes] = await Promise.all([
        fetch("/api/debug-auth"),
        fetch("/api/debug/auth-cookie-presence"),
      ]);
      setServerAuth(await authRes.json());
      setCookieDiag(await diagRes.json());
    };

    void run();
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: "monospace" }}>
      <h1>Debug Session</h1>

      <h2>Client-side Supabase session</h2>
      <pre>{JSON.stringify(clientSession, null, 2)}</pre>

      <h2>Server auth (/api/debug-auth)</h2>
      <pre>{JSON.stringify(serverAuth, null, 2)}</pre>

      <h2>Cookie + Supabase diagnosis (/api/debug/auth-cookie-presence)</h2>
      <pre>{JSON.stringify(cookieDiag, null, 2)}</pre>

      <h2>Browser document.cookie</h2>
      <pre style={{ whiteSpace: "pre-wrap" }}>{cookies || "(empty)"}</pre>
    </main>
  );
}
