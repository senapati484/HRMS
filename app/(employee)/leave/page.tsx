"use client";

import { useState, useEffect, useCallback } from "react";
import CopilotAsk from "@/components/CopilotAsk";

interface LeaveRequest {
  _id: string; leaveType: string; startDate: string; endDate: string;
  remarks?: string; status: string; hrComment?: string; createdAt: string;
}

interface ParsedLeave {
  leaveType: string | null; startDate: string | null; endDate: string | null;
  remarks: string;
  confidence: { leaveType: boolean; startDate: boolean; endDate: boolean; remarks: boolean };
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    Pending: { bg: "rgba(245,158,11,0.15)", color: "var(--warning)" },
    Approved: { bg: "rgba(16,185,129,0.15)", color: "var(--success)" },
    Rejected: { bg: "rgba(239,68,68,0.15)", color: "var(--danger)" },
  };
  const s = styles[status] || { bg: "rgba(156,163,175,0.15)", color: "var(--muted)" };
  return <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: s.bg, color: s.color }}>{status}</span>;
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

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

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
    setSubmitting(true); setSubmitMsg("");
    try {
      const res = await fetch("/api/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setSubmitMsg(data.error || "Failed to submit"); return; }
      setSubmitMsg("✓ Leave request submitted successfully!");
      setForm({ leaveType: "Paid", startDate: "", endDate: "", remarks: "" });
      setNlInput(""); setConfidence(null);
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
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">Leave & Time-off</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>Apply for leave and track your requests</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leave form */}
        <div className="space-y-4">
          {/* AI Copilot NL input */}
          <div className="rounded-2xl border p-5" style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">✨</span>
              <h3 className="font-semibold text-white text-sm">Describe your leave in plain language</h3>
            </div>
            <form onSubmit={handleNlParse} className="flex gap-2">
              <input value={nlInput} onChange={e => setNlInput(e.target.value)}
                placeholder='e.g. "2 days sick leave next Monday, I have a fever"'
                className="flex-1 px-4 py-2.5 rounded-xl text-sm text-white outline-none"
                style={{ background: "#0f1117", border: "1px solid var(--card-border)" }} />
              <button type="submit" disabled={nlLoading}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}>
                {nlLoading ? "..." : "Parse"}
              </button>
            </form>
            {confidence && (
              <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
                ✓ Form pre-filled · <span style={{ color: "var(--warning)" }}>Amber border = low confidence, please verify</span>
              </p>
            )}
          </div>

          {/* Leave request form */}
          <div className="rounded-2xl border p-5" style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
            <h3 className="font-semibold text-white mb-4">Apply for Leave</h3>
            {submitMsg && (
              <div className="mb-4 p-3 rounded-lg text-sm"
                style={{ background: submitMsg.startsWith("✓") ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", color: submitMsg.startsWith("✓") ? "var(--success)" : "var(--danger)" }}>
                {submitMsg}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--muted)" }}>Leave Type</label>
                <select value={form.leaveType} onChange={e => setForm(f => ({ ...f, leaveType: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none"
                  style={{ background: "#0f1117", border: inputBorder("leaveType") }}>
                  <option value="Paid">Paid Leave</option>
                  <option value="Sick">Sick Leave</option>
                  <option value="Unpaid">Unpaid Leave</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "var(--muted)" }}>Start Date</label>
                  <input type="date" required value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none"
                    style={{ background: "#0f1117", border: inputBorder("startDate"), colorScheme: "dark" }} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "var(--muted)" }}>End Date</label>
                  <input type="date" required value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none"
                    style={{ background: "#0f1117", border: inputBorder("endDate"), colorScheme: "dark" }} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--muted)" }}>Remarks</label>
                <textarea rows={3} value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none resize-none"
                  style={{ background: "#0f1117", border: inputBorder("remarks") }} placeholder="Reason for leave..." />
              </div>
              <button type="submit" disabled={submitting}
                className="w-full py-3 rounded-xl font-semibold text-white text-sm disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}>
                {submitting ? "Submitting..." : "Submit Leave Request"}
              </button>
            </form>
          </div>
        </div>

        {/* Copilot Q&A + Leave history */}
        <div className="space-y-4">
          <CopilotAsk />

          {/* Leave history */}
          <div className="rounded-2xl border" style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: "var(--card-border)" }}>
              <h3 className="font-semibold text-white">My Leave History</h3>
            </div>
            {leaves.length === 0 ? (
              <p className="text-sm p-5" style={{ color: "var(--muted)" }}>No leave requests yet.</p>
            ) : (
              <div className="divide-y" style={{ borderColor: "var(--card-border)" }}>
                {leaves.map(l => (
                  <div key={l._id} className="p-4">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <span className="text-sm font-medium text-white">{l.leaveType} Leave</span>
                        <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                          {new Date(l.startDate).toLocaleDateString("en-IN")} – {new Date(l.endDate).toLocaleDateString("en-IN")}
                        </p>
                      </div>
                      <StatusBadge status={l.status} />
                    </div>
                    {l.remarks && <p className="text-xs" style={{ color: "var(--muted)" }}>{l.remarks}</p>}
                    {l.hrComment && (
                      <p className="text-xs mt-1 px-3 py-2 rounded-lg" style={{ background: "rgba(99,102,241,0.08)", color: "var(--primary)" }}>
                        HR: {l.hrComment}
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
