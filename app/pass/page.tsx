"use client";

import { useState } from "react";

export default function PassRecovery() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/pass/resend-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await r.json();
      setMsg(data.message || "Check your email.");
    } catch {
      setMsg("Something went wrong. Try again in a minute.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: 520,
        margin: "80px auto",
        padding: "0 24px",
        fontFamily: "Georgia, serif",
        lineHeight: 1.6,
      }}
    >
      <h1 style={{ fontSize: 26 }}>Get your pass link again</h1>
      <p>Enter the email you used when you bought the Veil Season Pass.</p>

      <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
        <input
          type="email"
          value={email}
          placeholder="you@example.com"
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          style={{
            flex: 1,
            padding: "12px 14px",
            fontSize: 16,
            border: "1px solid #bbb",
            borderRadius: 4,
            fontFamily: "system-ui, sans-serif",
          }}
        />
        <button
          onClick={submit}
          disabled={busy}
          style={{
            padding: "12px 20px",
            fontSize: 16,
            background: "#1a1a1a",
            color: "#fff",
            border: 0,
            borderRadius: 4,
            cursor: busy ? "default" : "pointer",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {busy ? "..." : "Send"}
        </button>
      </div>

      {msg && <p style={{ marginTop: 20, color: "#444" }}>{msg}</p>}
    </main>
  );
}
