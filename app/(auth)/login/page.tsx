"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [unverifiedId, setUnverifiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403 && data.userId) {
          setUnverifiedId(data.userId);
        }
        setError(data.error);
        return;
      }
      router.push(data.user.role === "admin" ? "/admin" : "/dashboard");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (!unverifiedId) return;
    setVerifying(true);
    await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: unverifiedId }),
    });
    setVerifying(false);
    setUnverifiedId(null);
    setError("Email verified! You can now log in.");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--background)" }}>
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}>
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome to HRMS</h1>
          <p style={{ color: "var(--muted)" }} className="text-sm mt-1">Acme Corp · Employee Portal</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8 border" style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
          <h2 className="text-lg font-semibold text-white mb-6">Sign in to your account</h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: "rgba(239,68,68,0.1)", color: "var(--danger)", border: "1px solid rgba(239,68,68,0.3)" }}>
              {error}
              {unverifiedId && (
                <button onClick={handleVerify} disabled={verifying}
                  className="block mt-2 underline font-medium" style={{ color: "var(--warning)" }}>
                  {verifying ? "Verifying..." : "Click here to verify your email →"}
                </button>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--muted)" }}>Email address</label>
              <input
                type="email" required autoComplete="email"
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all"
                style={{ background: "#0f1117", border: "1px solid var(--card-border)" }}
                placeholder="you@acme.in"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--muted)" }}>Password</label>
              <input
                type="password" required autoComplete="current-password"
                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all"
                style={{ background: "#0f1117", border: "1px solid var(--card-border)" }}
                placeholder="••••••••"
              />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-all disabled:opacity-60"
              style={{ background: loading ? "var(--primary-hover)" : "linear-gradient(135deg, var(--primary), var(--accent))" }}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: "var(--muted)" }}>
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-medium" style={{ color: "var(--primary)" }}>
              Sign up
            </Link>
          </p>
        </div>

        {/* Demo hint */}
        <div className="mt-4 p-3 rounded-xl text-xs text-center" style={{ background: "rgba(99,102,241,0.08)", color: "var(--muted)", border: "1px solid rgba(99,102,241,0.2)" }}>
          Demo: <strong className="text-white">admin@acme.in</strong> / Password123! · or any employee
        </div>
      </div>
    </div>
  );
}
