"use client";

import { useState } from "react";
import Link from "next/link";

export default function SignupPage() {
  const [form, setForm] = useState({ name: "", employeeId: "", email: "", password: "", role: "employee" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ userId: string; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Signup failed"); return; }
      setSuccess({ userId: data.user._id, message: "Account created! Verify your email to continue." });
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (!success) return;
    setVerifying(true);
    await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: success.userId }),
    });
    setVerifying(false);
    setVerified(true);
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--background)" }}>
        <div className="w-full max-w-md rounded-2xl p-8 border text-center"
          style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: "rgba(16,185,129,0.15)" }}>
            <svg className="w-7 h-7" style={{ color: "var(--success)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Account Created!</h2>
          <p style={{ color: "var(--muted)" }} className="text-sm mb-6">
            {verified ? "Email verified! You can now sign in." : "Please verify your email to activate your account."}
          </p>
          {!verified && (
            <button onClick={handleVerify} disabled={verifying}
              className="w-full py-3 rounded-xl font-semibold text-white text-sm mb-4 transition-all"
              style={{ background: "linear-gradient(135deg, var(--success), #059669)" }}>
              {verifying ? "Verifying..." : "✓ Verify Email (Demo)"}
            </button>
          )}
          <Link href="/login"
            className="block w-full py-3 rounded-xl font-semibold text-sm text-center transition-all"
            style={{ background: verified ? "linear-gradient(135deg, var(--primary), var(--accent))" : "var(--card-border)", color: "white" }}>
            Go to Login →
          </Link>
          <p className="text-xs mt-4" style={{ color: "var(--muted)" }}>
            Note: Email verification is simulated for this demo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--background)" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}>
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Create Account</h1>
          <p style={{ color: "var(--muted)" }} className="text-sm mt-1">Join Acme Corp HRMS</p>
        </div>

        <div className="rounded-2xl p-8 border" style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: "rgba(239,68,68,0.1)", color: "var(--danger)", border: "1px solid rgba(239,68,68,0.3)" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { label: "Full Name", key: "name", type: "text", placeholder: "Priya Sharma" },
              { label: "Employee ID", key: "employeeId", type: "text", placeholder: "EMP006" },
              { label: "Email address", key: "email", type: "email", placeholder: "you@acme.in" },
              { label: "Password", key: "password", type: "password", placeholder: "Min 8 characters" },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key}>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--muted)" }}>{label}</label>
                <input type={type} required
                  value={form[key as keyof typeof form]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none"
                  style={{ background: "#0f1117", border: "1px solid var(--card-border)" }}
                  placeholder={placeholder}
                />
              </div>
            ))}

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--muted)" }}>Role</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none"
                style={{ background: "#0f1117", border: "1px solid var(--card-border)" }}>
                <option value="employee">Employee</option>
                <option value="admin">Admin / HR</option>
              </select>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-all mt-2 disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}>
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: "var(--muted)" }}>
            Already have an account?{" "}
            <Link href="/login" className="font-medium" style={{ color: "var(--primary)" }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
