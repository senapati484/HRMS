"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, Lock, CheckCircle2, AlertCircle } from "lucide-react";

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
            <Users className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground font-precise">Acme Corp Portal</h1>
          <p style={{ color: "var(--muted)" }} className="text-sm mt-1">Human Resource Management System</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8 glass-panel shadow-xl">
          <h2 className="text-lg font-bold text-foreground mb-6 font-precise">Sign in to your account</h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm font-semibold border flex flex-col gap-1"
              style={{
                background: error.includes("verified") ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
                color: error.includes("verified") ? "var(--success)" : "var(--danger)",
                borderColor: error.includes("verified") ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)",
              }}>
              <span className="flex items-center gap-1.5">
                {error.includes("verified") ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                {error}
              </span>
              {unverifiedId && (
                <button onClick={handleVerify} disabled={verifying}
                  className="block mt-2 underline font-bold cursor-pointer text-left text-xs" style={{ color: "var(--warning)" }}>
                  {verifying ? "Verifying..." : "Click here to verify email (demo) →"}
                </button>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "var(--muted)" }}>Email address</label>
              <input
                type="email" required autoComplete="email"
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl text-sm text-foreground outline-none border transition-all"
                style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
                placeholder="you@acme.in"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wide flex items-center gap-1.5" style={{ color: "var(--muted)" }}>
                <Lock size={12} className="text-indigo-400" /> Password
              </label>
              <input
                type="password" required autoComplete="current-password"
                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl text-sm text-foreground outline-none border transition-all"
                style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
                placeholder="••••••••"
              />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-white text-sm transition-all disabled:opacity-60 cursor-pointer"
              style={{ background: loading ? "var(--primary-hover)" : "linear-gradient(135deg, var(--primary), var(--accent))" }}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: "var(--muted)" }}>
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-bold hover:underline" style={{ color: "var(--primary)" }}>
              Sign up
            </Link>
          </p>
        </div>

        {/* Demo hint */}
        <div className="mt-4 p-4 rounded-xl text-xs text-center border font-precise"
          style={{
            background: "rgba(99,102,241,0.04)",
            color: "var(--muted)",
            borderColor: "var(--card-border)",
          }}>
          Demo Credentials: <strong className="text-foreground">admin@acme.in</strong> / <span className="font-mono text-indigo-400">Password123!</span>
        </div>
      </div>
    </div>
  );
}
