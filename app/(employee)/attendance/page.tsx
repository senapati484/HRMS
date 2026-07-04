"use client";

import { useState, useEffect, useCallback } from "react";

interface AttendanceRecord {
  _id: string; date: string; checkIn?: string; checkOut?: string; status: string;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Present: "rgba(16,185,129,0.15)",
    HalfDay: "rgba(245,158,11,0.15)",
    Absent: "rgba(239,68,68,0.15)",
  };
  const text: Record<string, string> = {
    Present: "var(--success)", HalfDay: "var(--warning)", Absent: "var(--danger)",
  };
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ background: colors[status] || "rgba(156,163,175,0.15)", color: text[status] || "var(--muted)" }}>
      {status}
    </span>
  );
}

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState("");

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

  useEffect(() => { fetchAttendance(); }, [fetchAttendance]);

  async function handleCheckInOut() {
    setLoading(true); setActionMsg("");
    try {
      const res = await fetch("/api/attendance", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setActionMsg(data.error); return; }
      setActionMsg(data.action === "checked-in" ? "✓ Checked in successfully!" : "✓ Checked out successfully!");
      await fetchAttendance();
    } finally {
      setLoading(false);
    }
  }

  const buttonLabel = () => {
    if (!todayRecord) return "Check In";
    if (todayRecord.checkIn && !todayRecord.checkOut) return "Check Out";
    return "Done for today ✓";
  };

  const isDisabled = !!(todayRecord?.checkIn && todayRecord?.checkOut) || loading;

  const byWeek: Record<string, AttendanceRecord[]> = {};
  records.forEach(r => {
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
        <h1 className="text-2xl font-bold text-white">Attendance</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>Track your daily check-in and check-out</p>
      </div>

      {/* Today's check-in card */}
      <div className="rounded-2xl border p-6" style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-white">Today — {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</h2>
            {todayRecord && (
              <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
                {todayRecord.checkIn && <>In: {new Date(todayRecord.checkIn).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</>}
                {todayRecord.checkOut && <> · Out: {new Date(todayRecord.checkOut).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</>}
              </p>
            )}
          </div>
          {todayRecord && <StatusBadge status={todayRecord.status} />}
        </div>

        {actionMsg && (
          <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: "rgba(16,185,129,0.1)", color: "var(--success)" }}>{actionMsg}</div>
        )}

        <button onClick={handleCheckInOut} disabled={isDisabled}
          className="px-8 py-3 rounded-xl font-semibold text-white text-sm transition-all disabled:opacity-50 hover:opacity-90"
          style={{ background: isDisabled ? "var(--card-border)" : "linear-gradient(135deg, var(--primary), var(--accent))" }}>
          {loading ? "Processing..." : buttonLabel()}
        </button>
      </div>

      {/* Weekly breakdown */}
      <div className="space-y-4">
        <h2 className="text-xs font-semibold tracking-widest uppercase" style={{ color: "var(--muted)" }}>History</h2>
        {Object.entries(byWeek).sort(([a], [b]) => b.localeCompare(a)).map(([weekStart, weekRecords]) => (
          <div key={weekStart} className="rounded-2xl border" style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
            <div className="px-6 py-4 border-b" style={{ borderColor: "var(--card-border)" }}>
              <h3 className="text-sm font-semibold text-white">
                Week of {new Date(weekStart).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </h3>
            </div>
            <div className="divide-y" style={{ borderColor: "var(--card-border)" }}>
              {weekRecords.map(r => (
                <div key={r._id} className="px-6 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white">{new Date(r.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</p>
                    {r.checkIn && (
                      <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                        {new Date(r.checkIn).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        {r.checkOut && ` → ${new Date(r.checkOut).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`}
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
          <div className="text-center py-12 rounded-2xl border" style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
            <p className="text-3xl mb-2">📭</p>
            <p className="text-sm" style={{ color: "var(--muted)" }}>No attendance records yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
