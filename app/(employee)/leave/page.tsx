"use client";

import { useState, useEffect, useCallback } from "react";
import { Sparkles, CheckCircle2, AlertCircle, Palmtree, ArrowRight } from "lucide-react";

interface LeaveRequest {
  _id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  remarks?: string;
  status: string;
  hrComment?: string;
  createdAt: string;
}

interface ParsedLeave {
  leaveType: string | null;
  startDate: string | null;
  endDate: string | null;
  remarks: string;
  confidence: {
    leaveType: boolean;
    startDate: boolean;
    endDate: boolean;
    remarks: boolean;
  };
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string; border: string }> = {
    Pending: {
      bg: "rgba(245,158,11,0.08)",
      color: "var(--warning)",
      border: "rgba(245,158,11,0.2)",
    },
    Approved: {
      bg: "rgba(16,185,129,0.08)",
      color: "var(--success)",
      border: "rgba(16,185,129,0.2)",
    },
    Rejected: {
      bg: "rgba(239,68,68,0.08)",
      color: "var(--danger)",
      border: "rgba(239,68,68,0.2)",
    },
  };
  const s = styles[status] || {
    bg: "rgba(156,163,175,0.08)",
    color: "var(--muted)",
    border: "rgba(156,163,175,0.2)",
  };
  return (
    <span
      className="text-xs px-2.5 py-0.5 rounded-full font-bold border"
      style={{ background: s.bg, color: s.color, borderColor: s.border }}
    >
      {status}
    </span>
  );
}

export default function LeavePage() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [form, setForm] = useState({ leaveType: "Paid", startDate: "", endDate: "", remarks: "" });
  const [nlInput, setNlInput] = useState("");
  const [nlLoading, setNlLoading] = useState(false);
  const [confidence, setConfidence] = useState<ParsedLeave["confidence"] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState("");

  const fetchLeaves = useCallback(async () => {
    const res = await fetch("/api/leave");
    const data = await res.json();
    if (data.leaves) setLeaves(data.leaves);
  }, []);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  async function handleNlParse(e: React.FormEvent) {
    e.preventDefault();
    if (!nlInput.trim()) return;
    setNlLoading(true);
    try {
      const res = await fetch("/api/copilot/parse-leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: nlInput }),
      });
      const data: ParsedLeave = await res.json();
      setForm({
        leaveType: data.leaveType || "Paid",
        startDate: data.startDate || "",
        endDate: data.endDate || "",
        remarks: data.remarks || "",
      });
      setConfidence(data.confidence);
    } finally {
      setNlLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitMsg("");
    try {
      const res = await fetch("/api/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitMsg(data.error || "Failed to submit request");
        return;
      }
      setSubmitMsg("✓ Leave request submitted successfully!");
      setForm({ leaveType: "Paid", startDate: "", endDate: "", remarks: "" });
      setNlInput("");
      setConfidence(null);
      await fetchLeaves();
    } finally {
      setSubmitting(false);
    }
  }

  const inputBorder = (field: keyof ParsedLeave["confidence"]) => {
    if (!confidence) return "1px solid var(--card-border)";
    return confidence[field] ? "1px solid var(--success)" : "1px solid var(--warning)";
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto text-foreground">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Leave & Time-off</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Apply for leaves, view balances, and track approvals
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leave form */}
        <div className="space-y-6">
          {/* AI Smart Input */}
          <div className="rounded-2xl p-5 glass-panel">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <Sparkles size={14} />
              </div>
              <h3 className="font-bold text-foreground text-sm font-precise">Smart Request</h3>
            </div>
            <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>
              Type your request details below. AI will automatically fill the form fields.
            </p>
            <form onSubmit={handleNlParse} className="flex gap-2">
              <input
                value={nlInput}
                onChange={(e) => setNlInput(e.target.value)}
                placeholder='e.g. "2 days sick leave next Monday, I have a fever"'
                className="flex-1 px-4 py-2.5 rounded-xl text-sm text-foreground outline-none border transition-all"
                style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
              />
              <button
                type="submit"
                disabled={nlLoading}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60 cursor-pointer flex items-center gap-1.5"
                style={{
                  background: "linear-gradient(135deg, var(--primary), var(--accent))",
                }}
              >
                {nlLoading ? "..." : "Parse"}
              </button>
            </form>
            {confidence && (
              <p className="text-[10px] mt-2 font-mono flex items-center gap-1" style={{ color: "var(--muted)" }}>
                <CheckCircle2 size={12} className="text-emerald-400" /> Form pre-filled ·{" "}
                <span className="text-amber-400 font-bold">Amber = Review before submitting</span>
              </p>
            )}
          </div>

          {/* Leave request form */}
          <div className="rounded-2xl p-5 glass-panel">
            <h3 className="font-bold text-foreground mb-4 text-sm tracking-wide font-precise">Apply for Leave</h3>
            {submitMsg && (
              <div
                className="mb-4 p-3 rounded-lg text-sm font-semibold border flex items-center gap-2"
                style={{
                  background: submitMsg.startsWith("✓")
                    ? "rgba(16,185,129,0.08)"
                    : "rgba(239,68,68,0.08)",
                  color: submitMsg.startsWith("✓") ? "var(--success)" : "var(--danger)",
                  borderColor: submitMsg.startsWith("✓")
                    ? "rgba(16,185,129,0.2)"
                    : "rgba(239,68,68,0.2)",
                }}
              >
                {submitMsg.startsWith("✓") ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                {submitMsg}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                  Leave Type
                </label>
                <select
                  value={form.leaveType}
                  onChange={(e) => setForm((f) => ({ ...f, leaveType: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl text-sm text-foreground outline-none cursor-pointer border transition-all"
                  style={{ background: "var(--background)", border: inputBorder("leaveType") }}
                >
                  <option value="Paid">Paid Leave</option>
                  <option value="Sick">Sick Leave</option>
                  <option value="Unpaid">Unpaid Leave</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl text-sm text-foreground outline-none border transition-all"
                    style={{
                      background: "var(--background)",
                      border: inputBorder("startDate"),
                      colorScheme: "dark",
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={form.endDate}
                    onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl text-sm text-foreground outline-none border transition-all"
                    style={{
                      background: "var(--background)",
                      border: inputBorder("endDate"),
                      colorScheme: "dark",
                    }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                  Remarks
                </label>
                <textarea
                  rows={3}
                  value={form.remarks}
                  onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl text-sm text-foreground outline-none resize-none border transition-all"
                  style={{ background: "var(--background)", border: inputBorder("remarks") }}
                  placeholder="Reason for leave request..."
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl font-bold text-white text-sm disabled:opacity-60 cursor-pointer transition-all hover:scale-[1.01]"
                style={{
                  background: "linear-gradient(135deg, var(--primary), var(--accent))",
                }}
              >
                {submitting ? "Submitting..." : "Submit Leave Request"}
              </button>
            </form>
          </div>
        </div>

        {/* Leave history */}
        <div className="space-y-6">
          <div className="rounded-2xl border overflow-hidden glass-panel">
            <div
              className="px-5 py-4 border-b flex items-center gap-2"
              style={{ borderColor: "var(--card-border)", background: "rgba(255,255,255,0.01)" }}
            >
              <Palmtree size={16} className="text-indigo-400" />
              <h3 className="font-bold text-foreground text-sm font-precise">My Leave History</h3>
            </div>
            {leaves.length === 0 ? (
              <p className="text-sm p-6 text-center" style={{ color: "var(--muted)" }}>
                No leave requests logged yet.
              </p>
            ) : (
              <div className="divide-y divide-black/5 dark:divide-white/5">
                {leaves.map((l) => (
                  <div key={l._id} className="p-5 hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <span className="text-sm font-bold text-foreground font-precise">
                          {l.leaveType} Leave
                        </span>
                        <div className="text-xs mt-1 font-mono flex items-center gap-1.5" style={{ color: "var(--muted)" }}>
                          <span>{new Date(l.startDate).toLocaleDateString("en-IN")}</span>
                          <ArrowRight size={10} />
                          <span>{new Date(l.endDate).toLocaleDateString("en-IN")}</span>
                        </div>
                      </div>
                      <StatusBadge status={l.status} />
                    </div>
                    {l.remarks && (
                      <p className="text-xs bg-slate-100 dark:bg-slate-950/40 p-2.5 rounded-lg border border-slate-200 dark:border-white/5" style={{ color: "var(--muted)" }}>
                        {l.remarks}
                      </p>
                    )}
                    {l.hrComment && (
                      <p
                        className="text-xs mt-2 px-3 py-2 rounded-lg border"
                        style={{
                          background: "rgba(99,102,241,0.04)",
                          borderColor: "rgba(99,102,241,0.15)",
                          color: "var(--primary)",
                        }}
                      >
                        <strong>HR Action Comment:</strong> {l.hrComment}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
