"use client";

import { useState } from "react";
import Link from "next/link";
import { UserPlus, CheckCircle2, AlertCircle } from "lucide-react";

export default function SignupPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    companyName: "",
    companyLogo: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ userId: string; message: string; employeeId?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Signup failed");
        return;
      }
      setSuccess({
        userId: data.user._id,
        employeeId: data.user.employeeId,
        message: "Account created! Verify your email to continue.",
      });
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
        <div className="w-full max-w-md rounded-2xl p-8 glass-panel text-center shadow-xl">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: "rgba(16,185,129,0.12)" }}>
            <CheckCircle2 className="w-7 h-7 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2 font-precise">Company Registered!</h2>
          <p style={{ color: "var(--muted)" }} className="text-sm mb-4 font-medium">
            {verified ? "Email verified! You can now sign in." : "Please verify your email to activate your account."}
          </p>
          {success.employeeId && (
            <div className="mb-6 p-4 rounded-xl text-left border" style={{ background: "rgba(99,102,241,0.04)", borderColor: "var(--card-border)" }}>
              <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">Your Admin Login ID</div>
              <div className="text-base font-bold font-mono text-foreground">{success.employeeId}</div>
              <p className="text-[10px] text-muted mt-1">Please save this Login ID. You can use it or your email to sign in.</p>
            </div>
          )}
          {!verified && (
            <button onClick={handleVerify} disabled={verifying}
              className="w-full py-3 rounded-xl font-bold text-white text-sm mb-4 transition-all cursor-pointer shadow-md shadow-emerald-950/20"
              style={{ background: "linear-gradient(135deg, var(--success), #059669)" }}>
              {verifying ? "Verifying..." : "✓ Verify Email (Demo)"}
            </button>
          )}
          <Link href="/login"
            className="block w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-center transition-all border"
            style={{
              background: verified ? "linear-gradient(135deg, var(--primary), var(--accent))" : "transparent",
              borderColor: "var(--card-border)",
              color: verified ? "white" : "var(--muted)"
            }}>
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
            <UserPlus className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground font-precise">Create Account</h1>
          <p style={{ color: "var(--muted)" }} className="text-sm mt-1">Register your company and admin account</p>
        </div>

        <div className="rounded-2xl p-8 glass-panel shadow-xl">
          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm font-semibold border flex items-center gap-1.5"
              style={{
                background: "rgba(239,68,68,0.08)",
                color: "var(--danger)",
                borderColor: "rgba(239,68,68,0.2)",
              }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { label: "Company Name", key: "companyName", type: "text", placeholder: "Acme Corp" },
              { label: "Company Logo URL", key: "companyLogo", type: "text", placeholder: "https://... (Optional)" },
              { label: "Admin Full Name", key: "name", type: "text", placeholder: "Priya Sharma" },
              { label: "Admin Email address", key: "email", type: "email", placeholder: "you@acme.in" },
              { label: "Password", key: "password", type: "password", placeholder: "Min 8 characters" },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "var(--muted)" }}>{label}</label>
                <input type={type} required={key !== "companyLogo"}
                  value={form[key as keyof typeof form]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl text-sm text-foreground outline-none border transition-all"
                  style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
                  placeholder={placeholder}
                />
              </div>
            ))}

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-white text-sm transition-all mt-4 disabled:opacity-60 cursor-pointer"
              style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}>
              {loading ? "Creating account..." : "Register Company & Admin"}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: "var(--muted)" }}>
            Already have an account?{" "}
            <Link href="/login" className="font-bold hover:underline" style={{ color: "var(--primary)" }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
