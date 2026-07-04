"use client";

import { useState, useEffect } from "react";
import { UserCheck, Phone, MapPin, Image, Info, Save, Shield } from "lucide-react";

interface UserType {
  _id: string;
  name: string;
  employeeId: string;
  email: string;
  role: string;
  phone?: string;
  address?: string;
  profilePicture?: string;
  department?: string;
  designation?: string;
  joinDate?: string;
  isVerified: boolean;
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserType | null>(null);
  const [form, setForm] = useState({ phone: "", address: "", profilePicture: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/users/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setUser(d.user);
          setForm({
            phone: d.user.phone || "",
            address: d.user.address || "",
            profilePicture: d.user.profilePicture || "",
          });
        }
      });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch(`/api/users/${user._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setUser(data.user);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-foreground animate-pulse font-medium">Loading profile...</div>
      </div>
    );
  }

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto text-foreground">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">My Profile</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Manage your personal details and contact settings
        </p>
      </div>

      {/* Avatar + identity */}
      <div className="rounded-2xl p-6 flex items-center gap-6 glass-panel">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold text-white flex-shrink-0 overflow-hidden shadow-md"
          style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
        >
          {user.profilePicture ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.profilePicture} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-foreground">{user.name}</h2>
          <p style={{ color: "var(--muted)" }} className="text-sm font-medium">
            {user.designation} · {user.department}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span
              className="text-xs px-2.5 py-0.5 rounded-full font-bold font-mono border"
              style={{
                background: "rgba(99,102,241,0.08)",
                color: "var(--primary)",
                borderColor: "rgba(99,102,241,0.2)",
              }}
            >
              {user.employeeId}
            </span>
            {user.isVerified && (
              <span
                className="text-xs px-2.5 py-0.5 rounded-full font-bold border flex items-center gap-1"
                style={{
                  background: "rgba(16,185,129,0.08)",
                  color: "var(--success)",
                  borderColor: "rgba(16,185,129,0.2)",
                }}
              >
                <UserCheck size={12} /> Verified
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Read-only info */}
      <div className="rounded-2xl p-6 glass-panel">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Info size={16} className="text-indigo-400" />
            <h3 className="font-bold text-foreground text-sm font-precise">Account Details</h3>
          </div>
          <span
            className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border flex items-center gap-1"
            style={{
              background: "rgba(239,68,68,0.08)",
              color: "var(--danger)",
              borderColor: "rgba(239,68,68,0.2)",
            }}
          >
            <Shield size={10} /> Locked fields
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: "Full Name", value: user.name },
            { label: "Email", value: user.email },
            { label: "Employee ID", value: user.employeeId },
            { label: "Security Role", value: user.role },
            { label: "Department", value: user.department || "—" },
            {
              label: "Join Date",
              value: user.joinDate ? new Date(user.joinDate).toLocaleDateString("en-IN") : "—",
            },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: "var(--muted)" }}>
                {label}
              </p>
              <p className="text-sm font-medium text-foreground">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Editable fields */}
      <div className="rounded-2xl p-6 glass-panel">
        <h3 className="font-bold text-foreground mb-4 text-sm font-precise">Edit Contact Info</h3>
        {error && (
          <div
            className="mb-4 p-3 rounded-lg text-sm font-semibold border flex items-center gap-2"
            style={{
              background: "rgba(239,68,68,0.08)",
              color: "var(--danger)",
              borderColor: "rgba(239,68,68,0.2)",
            }}
          >
            {error}
          </div>
        )}
        {saved && (
          <div
            className="mb-4 p-3 rounded-lg text-sm font-semibold border flex items-center gap-2"
            style={{
              background: "rgba(16,185,129,0.08)",
              color: "var(--success)",
              borderColor: "rgba(16,185,129,0.2)",
            }}
          >
            ✓ Profile parameters updated successfully!
          </div>
        )}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-2 uppercase tracking-wide flex items-center gap-1.5" style={{ color: "var(--muted)" }}>
              <Phone size={12} className="text-indigo-400" /> Phone Number
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl text-sm text-foreground outline-none border transition-all"
              style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
              placeholder="+91 98765 43210"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-2 uppercase tracking-wide flex items-center gap-1.5" style={{ color: "var(--muted)" }}>
              <MapPin size={12} className="text-indigo-400" /> Address Details
            </label>
            <textarea
              rows={2}
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl text-sm text-foreground outline-none resize-none border transition-all"
              style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
              placeholder="Your physical address..."
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-2 uppercase tracking-wide flex items-center gap-1.5" style={{ color: "var(--muted)" }}>
              <Image size={12} className="text-indigo-400" /> Profile Picture URL
            </label>
            <input
              type="text"
              value={form.profilePicture}
              onChange={(e) => setForm((f) => ({ ...f, profilePicture: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl text-sm text-foreground outline-none border transition-all"
              style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
              placeholder="https://..."
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-xl font-bold text-white text-sm disabled:opacity-60 cursor-pointer transition-all hover:scale-[1.01] flex items-center gap-2"
            style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
          >
            <Save size={14} />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
