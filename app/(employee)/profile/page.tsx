"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";

interface User {
  _id: string; name: string; employeeId: string; email: string;
  role: string; phone?: string; address?: string; profilePicture?: string;
  department?: string; designation?: string; joinDate?: string; isVerified: boolean;
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [form, setForm] = useState({ phone: "", address: "", profilePicture: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/login", { method: "GET" }).catch(() => {});
    // Get current user from cookie via a simple user-info endpoint
    fetch("/api/users/me").then(r => r.json()).then(d => {
      if (d.user) {
        setUser(d.user);
        setForm({ phone: d.user.phone || "", address: d.user.address || "", profilePicture: d.user.profilePicture || "" });
      }
    });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true); setError(""); setSaved(false);
    try {
      const res = await fetch(`/api/users/${user._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setUser(data.user);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
      <div className="text-white animate-pulse">Loading profile...</div>
    </div>
  );

  const initials = user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <header className="border-b px-6 py-4 flex items-center justify-between" style={{ borderColor: "var(--card-border)", background: "var(--card)" }}>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm" style={{ color: "var(--muted)" }}>← Dashboard</Link>
          <h1 className="text-lg font-bold text-white">My Profile</h1>
        </div>
        <LogoutButton />
      </header>

      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Avatar + identity */}
        <div className="rounded-2xl border p-6 flex items-center gap-6" style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold text-white flex-shrink-0"
            style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}>
            {user.profilePicture ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.profilePicture} alt={user.name} className="w-full h-full rounded-2xl object-cover" />
            ) : initials}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{user.name}</h2>
            <p style={{ color: "var(--muted)" }} className="text-sm">{user.designation} · {user.department}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(99,102,241,0.15)", color: "var(--primary)" }}>{user.employeeId}</span>
              {user.isVerified && <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(16,185,129,0.15)", color: "var(--success)" }}>✓ Verified</span>}
            </div>
          </div>
        </div>

        {/* Read-only info */}
        <div className="rounded-2xl border p-6" style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
          <h3 className="font-semibold text-white mb-4">Account Information <span className="text-xs font-normal ml-2 px-2 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.1)", color: "var(--danger)" }}>Read-only</span></h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "Full Name", value: user.name },
              { label: "Email", value: user.email },
              { label: "Employee ID", value: user.employeeId },
              { label: "Role", value: user.role },
              { label: "Department", value: user.department || "—" },
              { label: "Join Date", value: user.joinDate ? new Date(user.joinDate).toLocaleDateString("en-IN") : "—" },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs font-medium mb-1" style={{ color: "var(--muted)" }}>{label}</p>
                <p className="text-sm text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Editable fields */}
        <div className="rounded-2xl border p-6" style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
          <h3 className="font-semibold text-white mb-4">Edit Your Details</h3>
          {error && <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: "rgba(239,68,68,0.1)", color: "var(--danger)" }}>{error}</div>}
          {saved && <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: "rgba(16,185,129,0.1)", color: "var(--success)" }}>✓ Profile updated!</div>}
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--muted)" }}>Phone</label>
              <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none"
                style={{ background: "#0f1117", border: "1px solid var(--card-border)" }} placeholder="+91 98765 43210" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--muted)" }}>Address</label>
              <textarea rows={2} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none resize-none"
                style={{ background: "#0f1117", border: "1px solid var(--card-border)" }} placeholder="Your address" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--muted)" }}>Profile Picture URL / Base64</label>
              <input type="text" value={form.profilePicture} onChange={e => setForm(f => ({ ...f, profilePicture: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none"
                style={{ background: "#0f1117", border: "1px solid var(--card-border)" }} placeholder="https://... or data:image/..." />
            </div>
            <button type="submit" disabled={saving}
              className="px-6 py-3 rounded-xl font-semibold text-white text-sm disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
