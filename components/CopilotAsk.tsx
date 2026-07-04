"use client";

import { useState } from "react";

export default function CopilotAsk() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/copilot/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      setAnswer(data.answer || data.error || "No response");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border p-6 flex flex-col" style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
          style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}>
          ✨
        </div>
        <div>
          <h2 className="font-semibold text-white text-sm">HR Copilot</h2>
          <p className="text-xs" style={{ color: "var(--muted)" }}>Ask about leave balance or policy</p>
        </div>
      </div>

      {answer && (
        <div className="mb-4 p-4 rounded-xl text-sm" style={{ background: "rgba(99,102,241,0.08)", color: "var(--foreground)", border: "1px solid rgba(99,102,241,0.2)" }}>
          {answer}
        </div>
      )}

      <form onSubmit={ask} className="mt-auto flex gap-2">
        <input
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder='e.g. "How many sick leaves do I have left?"'
          className="flex-1 px-4 py-2.5 rounded-xl text-sm text-white outline-none"
          style={{ background: "#0f1117", border: "1px solid var(--card-border)" }}
        />
        <button type="submit" disabled={loading}
          className="px-4 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}>
          {loading ? "..." : "Ask"}
        </button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {["How many paid leaves left?", "What's the sick leave policy?", "Can I carry forward leaves?"].map(q => (
          <button key={q} onClick={() => setQuestion(q)}
            className="text-xs px-3 py-1 rounded-full transition-all"
            style={{ background: "rgba(99,102,241,0.1)", color: "var(--primary)", border: "1px solid rgba(99,102,241,0.2)" }}>
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
