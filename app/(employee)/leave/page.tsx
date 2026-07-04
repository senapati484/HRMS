"use client";

import { useState, useEffect, useCallback } from "react";
import CopilotAsk from "@/components/CopilotAsk";
import { Palmtree, Clock, Calendar, Check, X, FileText, CheckCircle2, Inbox, ChevronLeft, ChevronRight, RefreshCw, Plane } from "lucide-react";

interface LeaveRequest {
  _id: string;
  userId?: {
    name: string;
    employeeId: string;
    department?: string;
  };
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
    Pending: { bg: "var(--warning-bg)", color: "var(--warning)", border: "var(--warning-border)" },
    Approved: { bg: "var(--success-bg)", color: "var(--success)", border: "var(--success-border)" },
    Rejected: { bg: "var(--danger-bg)", color: "var(--danger)", border: "var(--danger-border)" },
  };
  const s = styles[status] || { bg: "rgba(156,163,175,0.12)", color: "var(--muted)", border: "rgba(156,163,175,0.2)" };
  return (
    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold font-precise border uppercase tracking-wider"
      style={{ background: s.bg, color: s.color, borderColor: s.border }}>
      {status}
    </span>
  );
}

export default function LeavePage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [form, setForm] = useState({ leaveType: "Paid", startDate: "", endDate: "", remarks: "" });
  const [nlInput, setNlInput] = useState("");
  const [nlLoading, setNlLoading] = useState(false);
  const [confidence, setConfidence] = useState<ParsedLeave["confidence"] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState("");

  // Month navigation state for the calendar view
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // Date selection states from calendar clicking
  const [selectionRange, setSelectionRange] = useState<{ start: string | null; end: string | null }>({ start: null, end: null });

  // Admin decision states
  const [hrComments, setHrComments] = useState<Record<string, string>>({});
  const [decisionLoading, setDecisionLoading] = useState<string | null>(null);

  const fetchUserData = async () => {
    try {
      const res = await fetch("/api/users/me");
      const data = await res.json();
      if (data.user) setCurrentUser(data.user);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLeaves = useCallback(async () => {
    if (!currentUser) return;
    try {
      const isSearchAdmin = currentUser.role === "admin";
      const res = await fetch(`/api/leave?all=${isSearchAdmin}`);
      const data = await res.json();
      if (data.leaves) setLeaves(data.leaves);
    } catch (err) {
      console.error(err);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchUserData();
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
      
      if (data.startDate) {
        setSelectionRange({ start: data.startDate, end: data.endDate || data.startDate });
      }
    } catch (err) {
      console.error(err);
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
        setSubmitMsg(data.error || "Failed to submit request.");
        return;
      }
      setSubmitMsg("✓ Leave request submitted successfully!");
      setForm({ leaveType: "Paid", startDate: "", endDate: "", remarks: "" });
      setNlInput("");
      setConfidence(null);
      setSelectionRange({ start: null, end: null });
      await fetchLeaves();
    } catch (err) {
      setSubmitMsg("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // Admin approval/rejection handler
  async function handleDecision(leaveId: string, status: "Approved" | "Rejected") {
    setDecisionLoading(leaveId);
    try {
      const hrComment = hrComments[leaveId] || "";
      const res = await fetch(`/api/leave/${leaveId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, hrComment }),
      });
      if (res.ok) {
        setHrComments(prev => {
          const next = { ...prev };
          delete next[leaveId];
          return next;
        });
        await fetchLeaves();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDecisionLoading(null);
    }
  }

  // Calendar Day Click Range Handler
  const handleCalendarDayClick = (dateStr: string) => {
    if (!selectionRange.start || (selectionRange.start && selectionRange.end)) {
      // Start a new selection
      setSelectionRange({ start: dateStr, end: null });
      setForm(f => ({ ...f, startDate: dateStr, endDate: dateStr }));
    } else {
      // Complete selection range
      const startD = new Date(selectionRange.start);
      const clickedD = new Date(dateStr);
      
      if (clickedD >= startD) {
        setSelectionRange({ ...selectionRange, end: dateStr });
        setForm(f => ({ ...f, endDate: dateStr }));
      } else {
        // Reset start to clicked date
        setSelectionRange({ start: dateStr, end: null });
        setForm(f => ({ ...f, startDate: dateStr, endDate: dateStr }));
      }
    }
  };

  const adjustCalendarMonth = (offset: number) => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + offset, 1));
  };

  // Build Calendar grid cells
  const getCalendarCells = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();

    const startOfMonth = new Date(year, month, 1);
    const numDays = new Date(year, month + 1, 0).getDate();
    const startDayIndex = startOfMonth.getDay();

    const cells: { dateStr: string; dayNum: number; status?: string }[] = [];

    // offset
    for (let i = 0; i < startDayIndex; i++) {
      cells.push({ dateStr: "", dayNum: 0 });
    }

    // days
    for (let day = 1; day <= numDays; day++) {
      const d = new Date(year, month, day);
      const dateStr = d.toISOString().split("T")[0];

      // Find status based on approved leave requests
      const matchingApprovedLeave = leaves.find(l => 
        l.status === "Approved" && 
        new Date(l.startDate) <= new Date(dateStr + "T23:59:59") && 
        new Date(l.endDate) >= new Date(dateStr + "T00:00:00")
      );

      cells.push({ 
        dateStr, 
        dayNum: day, 
        status: matchingApprovedLeave ? "ApprovedLeave" : undefined 
      });
    }

    return cells;
  };

  const inputBorder = (field: keyof ParsedLeave["confidence"]) => {
    if (!confidence) return "1px solid var(--card-border)";
    return confidence[field] ? "1px solid var(--success)" : "1px solid var(--warning)";
  };

  if (!currentUser) {
    return (
      <div className="flex h-96 items-center justify-center text-sm text-white animate-pulse">
        Loading time off panel...
      </div>
    );
  }

  const isAdmin = currentUser.role === "admin";

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto text-foreground animate-in fade-in duration-300">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Time Off</h1>
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          {isAdmin ? "Manage and decide on employee leave applications" : "Apply for time off and track your leave request statuses"}
        </p>
      </div>

      {/* ADMIN VIEW: Leave Requests Table with quick Approve/Reject */}
      {isAdmin ? (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="rounded-2xl border overflow-hidden glass-panel">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs min-w-[700px]">
                <thead>
                  <tr className="border-b" style={{ borderColor: "var(--card-border)", background: "rgba(255,255,255,0.02)" }}>
                    <th className="p-4 font-bold text-foreground uppercase tracking-wider text-[10px]">Employee</th>
                    <th className="p-4 font-bold text-foreground uppercase tracking-wider text-[10px]">Leave Type</th>
                    <th className="p-4 font-bold text-foreground uppercase tracking-wider text-[10px]">Duration</th>
                    <th className="p-4 font-bold text-foreground uppercase tracking-wider text-[10px]">Reason</th>
                    <th className="p-4 font-bold text-foreground uppercase tracking-wider text-[10px]">HR Note / Comment</th>
                    <th className="p-4 font-bold text-foreground uppercase tracking-wider text-[10px] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {leaves.map((l) => (
                    <tr key={l._id} className="hover:bg-slate-100/5 dark:hover:bg-white/[0.01] transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-foreground">{l.userId?.name || "Unknown User"}</div>
                        <div className="text-[10px] mt-0.5" style={{ color: "var(--muted)" }}>{l.userId?.employeeId}</div>
                      </td>
                      <td className="p-4 text-foreground font-semibold uppercase tracking-wider text-[10px]">{l.leaveType}</td>
                      <td className="p-4 text-foreground">
                        <div className="font-medium">
                          {new Date(l.startDate).toLocaleDateString("en-IN")} – {new Date(l.endDate).toLocaleDateString("en-IN")}
                        </div>
                        <div className="text-[10px] mt-0.5" style={{ color: "var(--muted)" }}>
                          Applied: {new Date(l.createdAt).toLocaleDateString("en-IN")}
                        </div>
                      </td>
                      <td className="p-4 text-foreground max-w-xs truncate" title={l.remarks}>{l.remarks || "—"}</td>
                      <td className="p-4">
                        {l.status === "Pending" ? (
                          <input
                            type="text"
                            placeholder="Add rejection/approval note..."
                            value={hrComments[l._id] || ""}
                            onChange={(e) => setHrComments({ ...hrComments, [l._id]: e.target.value })}
                            className="px-3 py-1.5 rounded-lg text-[11px] text-foreground outline-none border w-full min-w-[150px]"
                            style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
                          />
                        ) : (
                          <span className="italic text-muted">{l.hrComment || "—"}</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {l.status === "Pending" ? (
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handleDecision(l._id, "Approved")}
                              disabled={decisionLoading === l._id}
                              className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg cursor-pointer"
                              title="Approve"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => handleDecision(l._id, "Rejected")}
                              disabled={decisionLoading === l._id}
                              className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg cursor-pointer"
                              title="Reject"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <StatusBadge status={l.status} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {leaves.length === 0 && (
              <div className="text-center py-16 flex flex-col items-center justify-center">
                <Inbox className="w-12 h-12 text-slate-500 mb-3" />
                <p className="text-sm font-medium" style={{ color: "var(--muted)" }}>
                  No leave requests submitted yet.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* EMPLOYEE VIEW: Balance Allocation, Form, and Calendar Selector + Request logs */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-300">
          
          {/* Left panel: Leave submission forms */}
          <div className="space-y-4">
            {/* AI Copilot natural language box */}
            <div className="rounded-2xl border p-5 glass-panel" style={{ borderColor: "var(--card-border)" }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">✨</span>
                <h3 className="font-bold text-foreground text-sm">Describe leave in plain language</h3>
              </div>
              <form onSubmit={handleNlParse} className="flex gap-2">
                <input
                  value={nlInput}
                  onChange={(e) => setNlInput(e.target.value)}
                  placeholder='e.g. "I need 2 days off next Mon/Tue because I have fever"'
                  className="flex-1 px-4 py-2.5 rounded-xl text-xs text-foreground outline-none border"
                  style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
                />
                <button
                  type="submit"
                  disabled={nlLoading}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white disabled:opacity-60 cursor-pointer"
                  style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
                >
                  {nlLoading ? "Parsing..." : "Parse"}
                </button>
              </form>
              {confidence && (
                <p className="text-[10px] mt-2 flex items-center gap-1.5" style={{ color: "var(--muted)" }}>
                  <CheckCircle2 size={12} className="text-green-500" /> Auto-filled fields. <span style={{ color: "var(--warning)" }}>Amber border = verify details.</span>
                </p>
              )}
            </div>

            {/* Standard leave request form */}
            <div className="rounded-2xl border p-5 glass-panel" style={{ borderColor: "var(--card-border)" }}>
              <h3 className="font-bold text-foreground mb-4 text-sm">Apply for Leave</h3>
              {submitMsg && (
                <div
                  className="mb-4 p-3 rounded-lg text-xs font-semibold border flex items-center gap-2"
                  style={{
                    background: submitMsg.startsWith("✓") ? "var(--success-bg)" : "var(--danger-bg)",
                    color: submitMsg.startsWith("✓") ? "var(--success)" : "var(--danger)",
                    borderColor: submitMsg.startsWith("✓") ? "var(--success-border)" : "var(--danger-border)",
                  }}
                >
                  {submitMsg.startsWith("✓") ? <CheckCircle2 size={14} /> : <Clock size={14} className="text-red-400" />}
                  {submitMsg}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--muted)" }}>Leave Type</label>
                  <select
                    value={form.leaveType}
                    onChange={(e) => setForm((f) => ({ ...f, leaveType: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl text-xs text-foreground outline-none border cursor-pointer"
                    style={{ background: "var(--background)", border: inputBorder("leaveType") }}
                  >
                    <option value="Paid">Paid Leave</option>
                    <option value="Sick">Sick Leave</option>
                    <option value="Unpaid">Unpaid Leave</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--muted)" }}>Start Date</label>
                    <input
                      type="date"
                      required
                      value={form.startDate}
                      onChange={(e) => {
                        setForm((f) => ({ ...f, startDate: e.target.value }));
                        setSelectionRange((r) => ({ ...r, start: e.target.value }));
                      }}
                      className="w-full px-4 py-2.5 rounded-xl text-xs text-foreground outline-none border"
                      style={{ background: "var(--background)", border: inputBorder("startDate"), colorScheme: "dark" }}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--muted)" }}>End Date</label>
                    <input
                      type="date"
                      required
                      value={form.endDate}
                      onChange={(e) => {
                        setForm((f) => ({ ...f, endDate: e.target.value }));
                        setSelectionRange((r) => ({ ...r, end: e.target.value }));
                      }}
                      className="w-full px-4 py-2.5 rounded-xl text-xs text-foreground outline-none border"
                      style={{ background: "var(--background)", border: inputBorder("endDate"), colorScheme: "dark" }}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--muted)" }}>Remarks</label>
                  <textarea
                    rows={3}
                    value={form.remarks}
                    onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl text-xs text-foreground outline-none border resize-none"
                    style={{ background: "var(--background)", border: inputBorder("remarks") }}
                    placeholder="Provide context / reason for leave request..."
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-xl font-bold text-white text-xs disabled:opacity-60 transition-all cursor-pointer"
                  style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
                >
                  {submitting ? "Submitting request..." : "Submit Leave Application"}
                </button>
              </form>
            </div>

            {/* Leave Allocations Stats Card */}
            <div className="rounded-2xl border p-5 glass-panel" style={{ borderColor: "var(--card-border)" }}>
              <h3 className="font-bold text-foreground text-sm mb-4">Leave Allocations</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                {[
                  { label: "Paid Leave", balance: "18 Days Left", color: "text-indigo-400" },
                  { label: "Sick Leave", balance: "12 Days Left", color: "text-emerald-400" },
                  { label: "Casual Leave", balance: "8 Days Left", color: "text-amber-400" },
                ].map((alloc, idx) => (
                  <div key={idx} className="p-3 bg-slate-500/5 rounded-xl border" style={{ borderColor: "var(--card-border)" }}>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-muted">{alloc.label}</div>
                    <div className={`text-xs font-extrabold mt-2 ${alloc.color}`}>{alloc.balance}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right panel: Calendar Date Selector & My Leave Requests */}
          <div className="space-y-4">
            
            {/* Interactive Leave Calendar Picker */}
            <div className="rounded-2xl border p-5 glass-panel space-y-4" style={{ borderColor: "var(--card-border)" }}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-foreground text-xs uppercase tracking-wider">Leave Calendar Picker</h3>
                  <p className="text-[9px] text-muted">Click a start day and end day to select leave range</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => adjustCalendarMonth(-1)} className="p-1 border rounded-lg hover:bg-slate-500/5 transition-all text-slate-400 hover:text-white cursor-pointer" style={{ borderColor: "var(--card-border)" }}>
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-[11px] font-bold text-foreground capitalize w-20 text-center font-precise">
                    {calendarMonth.toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                  </span>
                  <button onClick={() => adjustCalendarMonth(1)} className="p-1 border rounded-lg hover:bg-slate-500/5 transition-all text-slate-400 hover:text-white cursor-pointer" style={{ borderColor: "var(--card-border)" }}>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1.5 text-center font-bold text-[9px] text-slate-400 uppercase tracking-widest border-b pb-2" style={{ borderColor: "var(--card-border)" }}>
                <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
              </div>

              {/* Calendar cells */}
              <div className="grid grid-cols-7 gap-1.5">
                {getCalendarCells().map((cell, idx) => {
                  if (!cell.dateStr) {
                    return <div key={`empty-${idx}`} className="h-10 rounded-lg bg-slate-500/5 opacity-20 border border-transparent" />;
                  }

                  const isStart = cell.dateStr === selectionRange.start;
                  const isEnd = cell.dateStr === selectionRange.end;
                  const inRange = selectionRange.start && selectionRange.end &&
                    cell.dateStr >= selectionRange.start && cell.dateStr <= selectionRange.end;

                  const isToday = cell.dateStr === new Date().toISOString().split("T")[0];

                  let cellBg = "rgba(255,255,255,0.01)";
                  let borderCol = "var(--card-border)";
                  let textCol = "text-foreground";

                  if (cell.status === "ApprovedLeave") {
                    cellBg = "rgba(59,130,246,0.12)";
                    borderCol = "rgba(59,130,246,0.3)";
                    textCol = "text-blue-400";
                  } else if (isStart || isEnd) {
                    cellBg = "var(--primary)";
                    borderCol = "var(--primary)";
                    textCol = "text-white font-extrabold";
                  } else if (inRange) {
                    cellBg = "rgba(99,102,241,0.15)";
                    borderCol = "rgba(99,102,241,0.25)";
                    textCol = "text-indigo-400";
                  } else if (isToday) {
                    borderCol = "var(--primary)";
                  }

                  return (
                    <div
                      key={cell.dateStr}
                      onClick={() => handleCalendarDayClick(cell.dateStr)}
                      className={`h-10 rounded-lg border flex flex-col items-center justify-center text-[10px] font-bold cursor-pointer hover:border-indigo-400 transition-all select-none`}
                      style={{
                        background: cellBg,
                        borderColor: borderCol
                      }}
                    >
                      <span className={textCol}>{cell.dayNum}</span>
                      {cell.status === "ApprovedLeave" && (
                        <span className="h-1 w-1 rounded-full bg-blue-400 mt-0.5" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Leave History List */}
            <div className="rounded-2xl border overflow-hidden glass-panel" style={{ borderColor: "var(--card-border)" }}>
              <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: "var(--card-border)", background: "rgba(255,255,255,0.01)" }}>
                <Palmtree size={16} className="text-indigo-400" />
                <h3 className="font-bold text-foreground text-sm">My Leave Requests</h3>
              </div>
              <div className="divide-y divide-black/5 dark:divide-white/5 max-h-[300px] overflow-y-auto">
                {leaves.map((l) => (
                  <div key={l._id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-semibold text-foreground uppercase tracking-wider">{l.leaveType} Leave</span>
                        <p className="text-[10px] mt-0.5" style={{ color: "var(--muted)" }}>
                          {new Date(l.startDate).toLocaleDateString("en-IN")} – {new Date(l.endDate).toLocaleDateString("en-IN")}
                        </p>
                      </div>
                      <StatusBadge status={l.status} />
                    </div>
                    {l.remarks && <p className="text-[11px]" style={{ color: "var(--muted)" }}>{l.remarks}</p>}
                    {l.hrComment && (
                      <p className="text-[10px] p-2 bg-indigo-500/5 rounded-lg border border-indigo-500/10 text-indigo-400 font-medium">
                        HR Note: {l.hrComment}
                      </p>
                    )}
                  </div>
                ))}
                {leaves.length === 0 && (
                  <p className="text-xs p-5 text-center text-muted">No leave requests submitted yet.</p>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
