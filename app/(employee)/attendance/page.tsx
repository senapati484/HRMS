"use client";

import { useState, useEffect, useCallback } from "react";
import { Clock, Calendar, CheckCircle2, ChevronRight, Inbox } from "lucide-react";

interface AttendanceRecord {
  _id: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: string;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Present: "var(--success-bg)",
    HalfDay: "var(--warning-bg)",
    Absent: "var(--danger-bg)",
  };
  const text: Record<string, string> = {
    Present: "var(--success)",
    HalfDay: "var(--warning)",
    Absent: "var(--danger)",
  };
  const borderColors: Record<string, string> = {
    Present: "var(--success-border)",
    HalfDay: "var(--warning-border)",
    Absent: "var(--danger-border)",
  };

  return (
    <span
      className="text-xs px-2.5 py-0.5 rounded-full font-bold font-precise border uppercase tracking-wider"
      style={{
        background: colors[status] || "rgba(156,163,175,0.12)",
        color: text[status] || "var(--muted)",
        borderColor: borderColors[status] || "rgba(156,163,175,0.2)",
      }}
    >
      {status}
    </span>
  );
}

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState("");
  const [mounted, setMounted] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const fetchAttendance = useCallback(async () => {
    const res = await fetch("/api/attendance");
    const data = await res.json();
    if (data.attendance) {
      setRecords(data.attendance);
      const todayRec = data.attendance.find((r: AttendanceRecord) => r.date === today);
      setTodayRecord(todayRec || null);
    }
  }, [today]);

  useEffect(() => {
    setMounted(true);
    fetchAttendance();
  }, [fetchAttendance]);

  async function handleCheckInOut() {
    setLoading(true);
    setActionMsg("");
    try {
      const res = await fetch("/api/attendance", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setActionMsg(data.error);
        return;
      }
      setActionMsg(
        data.action === "checked-in"
          ? "✓ Checked in successfully!"
          : "✓ Checked out successfully!"
      );
      await fetchAttendance();
    } finally {
      setLoading(false);
    }
  }

  const buttonLabel = () => {
    if (!todayRecord) return "Check In";
    if (todayRecord.checkIn && !todayRecord.checkOut) return "Check Out";
    return "Done for today";
  };

  const isDisabled = !!(todayRecord?.checkIn && todayRecord?.checkOut) || loading;

  const byWeek: Record<string, AttendanceRecord[]> = {};
  records.forEach((r) => {
    const d = new Date(r.date);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay() + 1);
    const key = weekStart.toISOString().split("T")[0];
    if (!byWeek[key]) byWeek[key] = [];
    byWeek[key].push(r);
  });

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Attendance Log</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Register daily check-ins and review weekly time logs
        </p>
      </div>

      {/* Today's check-in card */}
      <div className="rounded-2xl p-6 glass-panel flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex gap-4 items-start">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-indigo-400 flex-shrink-0"
            style={{ background: "rgba(99,102,241,0.1)" }}
          >
            <Clock size={24} />
          </div>
          <div>
            <h2 className="font-bold text-foreground text-sm tracking-wide font-precise" suppressHydrationWarning>
              Today —{" "}
              {mounted ? new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "long",
              }) : "Loading date..."}
            </h2>
            {todayRecord ? (
              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs font-mono" style={{ color: "var(--muted)" }}>
                {todayRecord.checkIn && (
                  <span>
                    Check In:{" "}
                    <strong>
                      {new Date(todayRecord.checkIn).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </strong>
                  </span>
                )}
                {todayRecord.checkOut && (
                  <>
                    <span style={{ color: "var(--muted)" }}>|</span>
                    <span>
                      Check Out:{" "}
                      <strong>
                        {new Date(todayRecord.checkOut).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </strong>
                    </span>
                  </>
                )}
              </div>
            ) : (
              <p className="text-xs mt-1.5" style={{ color: "var(--muted)" }}>
                No active check-in record for today.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row md:items-center gap-4 self-end md:self-center">
          {todayRecord && <StatusBadge status={todayRecord.status} />}
          <button
            onClick={handleCheckInOut}
            disabled={isDisabled}
            className={`px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
              isDisabled ? "cursor-not-allowed" : "text-white cursor-pointer hover:scale-[1.02]"
            }`}
            style={{
              background: isDisabled
                ? "var(--card-border)"
                : "linear-gradient(135deg, var(--primary), var(--accent))",
              border: "1px solid var(--card-border)",
              color: isDisabled ? "var(--muted)" : "#ffffff",
            }}
          >
            {isDisabled && todayRecord?.checkOut ? (
              <CheckCircle2 size={16} className="text-emerald-500" />
            ) : (
              <Clock size={16} />
            )}
            {loading ? "Processing..." : buttonLabel()}
          </button>
        </div>
      </div>

      {actionMsg && (
        <div
          className="p-4 rounded-xl text-sm font-semibold border flex items-center gap-2"
          style={{
            background: actionMsg.startsWith("✓") ? "var(--success-bg)" : "var(--danger-bg)",
            color: actionMsg.startsWith("✓") ? "var(--success)" : "var(--danger)",
            borderColor: actionMsg.startsWith("✓") ? "var(--success-border)" : "var(--danger-border)",
          }}
        >
          {actionMsg.startsWith("✓") ? (
            <CheckCircle2 size={16} />
          ) : (
            <Clock size={16} className="text-red-400" />
          )}
          {actionMsg}
        </div>
      )}

      {/* Weekly breakdown */}
      <div className="space-y-4">
        <h2
          className="text-[10px] font-bold tracking-widest uppercase font-precise"
          style={{ color: "var(--muted)", opacity: 0.6 }}
        >
          Attendance Log History
        </h2>
        {Object.entries(byWeek)
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([weekStart, weekRecords]) => (
            <div key={weekStart} className="rounded-2xl border overflow-hidden glass-panel">
              <div
                className="px-6 py-4 border-b flex items-center gap-2"
                style={{ borderColor: "var(--card-border)", background: "rgba(255,255,255,0.01)" }}
              >
                <Calendar size={16} className="text-indigo-400" />
                <h3 className="text-sm font-bold text-foreground font-precise">
                  Week of{" "}
                  {new Date(weekStart).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })}
                </h3>
              </div>
              <div className="divide-y divide-black/5 dark:divide-white/5">
                {weekRecords.map((r) => (
                  <div key={r._id} className="px-6 py-3.5 flex items-center justify-between hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {new Date(r.date + "T00:00:00").toLocaleDateString("en-IN", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                      {r.checkIn && (
                        <p className="text-xs mt-1 font-mono" style={{ color: "var(--muted)" }}>
                          {new Date(r.checkIn).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {r.checkOut && (
                            <>
                              <ChevronRight size={10} className="inline mx-1" />
                              {new Date(r.checkOut).toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </>
                          )}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        {Object.keys(byWeek).length === 0 && (
          <div className="text-center py-16 rounded-2xl border glass-panel flex flex-col items-center justify-center">
            <Inbox className="w-12 h-12 text-slate-500 mb-3" />
            <p className="text-sm font-medium" style={{ color: "var(--muted)" }}>
              No attendance logs registered yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
