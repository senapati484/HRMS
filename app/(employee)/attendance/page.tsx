"use client";

import { useState, useEffect, useCallback } from "react";
import { Clock, Calendar, Search, ChevronLeft, ChevronRight, Inbox, RefreshCw } from "lucide-react";

interface AttendanceRecord {
  _id: string;
  userId?: {
    name: string;
    employeeId: string;
    department?: string;
  };
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: string;
}

export default function AttendancePage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Date selection states
  // Admin selected date (defaults to today)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  // Employee selected month/year (defaults to current month)
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Search filter for Admin
  const [adminSearch, setAdminSearch] = useState("");

  const fetchUserData = async () => {
    try {
      const res = await fetch("/api/users/me");
      const data = await res.json();
      if (data.user) {
        setCurrentUser(data.user);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAttendanceData = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      if (currentUser.role === "admin") {
        // Fetch all users' attendance for the selected date
        const res = await fetch(`/api/attendance?from=${selectedDate}&to=${selectedDate}&all=true`);
        const data = await res.json();
        if (data.attendance) setRecords(data.attendance);
      } else {
        // Fetch current user's attendance for the selected month range
        const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
          .toISOString().split("T")[0];
        const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
          .toISOString().split("T")[0];

        const [resAtt, resLeaves] = await Promise.all([
          fetch(`/api/attendance?from=${startOfMonth}&to=${endOfMonth}`),
          fetch("/api/leave"),
        ]);

        const dataAtt = await resAtt.json();
        const dataLeaves = await resLeaves.json();

        if (dataAtt.attendance) setRecords(dataAtt.attendance);
        if (dataLeaves.leaves) setLeaves(dataLeaves.leaves);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentUser, selectedDate, currentMonth]);

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    fetchAttendanceData();
  }, [fetchAttendanceData]);

  // Compute work hours and extra hours
  const computeHours = (checkInStr?: string, checkOutStr?: string) => {
    if (!checkInStr || !checkOutStr) return { work: "—", extra: "—" };
    
    const checkIn = new Date(checkInStr);
    const checkOut = new Date(checkOutStr);
    const diffMs = checkOut.getTime() - checkIn.getTime();
    const hours = diffMs / (1000 * 60 * 60);

    const wH = Math.floor(hours);
    const wM = Math.floor((hours - wH) * 60);
    const workFormatted = `${wH.toString().padStart(2, "0")}:${wM.toString().padStart(2, "0")}`;

    const extraHours = Math.max(0, hours - 8);
    const eH = Math.floor(extraHours);
    const eM = Math.floor((extraHours - eH) * 60);
    const extraFormatted = extraHours > 0 ? `${eH.toString().padStart(2, "0")}:${eM.toString().padStart(2, "0")}` : "00:00";

    return { work: workFormatted, extra: extraFormatted };
  };

  // Month navigation
  const adjustMonth = (offset: number) => {
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1);
    setCurrentMonth(nextMonth);
  };

  // Calculate Employee Month Stats
  const getEmployeeStats = () => {
    // 1. Days present
    const presentCount = records.length;

    // 2. Approved leaves in selected month
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    const leavesCount = leaves.filter((l: any) => {
      if (l.status !== "Approved") return false;
      const lStart = new Date(l.startDate);
      const lEnd = new Date(l.endDate);
      // overlap checks
      return lStart <= endOfMonth && lEnd >= startOfMonth;
    }).length;

    // 3. Count week days (Monday - Friday) in this month
    let totalWorkingDays = 0;
    const dateCursor = new Date(startOfMonth);
    while (dateCursor <= endOfMonth) {
      const day = dateCursor.getDay();
      if (day !== 0 && day !== 6) { // not Sunday or Saturday
        totalWorkingDays++;
      }
      dateCursor.setDate(dateCursor.getDate() + 1);
    }

    return { presentCount, leavesCount, totalWorkingDays };
  };

  if (!currentUser) {
    return (
      <div className="flex h-96 items-center justify-center text-sm text-white animate-pulse">
        Loading attendance panel...
      </div>
    );
  }

  const isAdmin = currentUser.role === "admin";
  const stats = !isAdmin ? getEmployeeStats() : null;

  // Filter admin records by search query
  const filteredRecords = records.filter((r) => {
    const name = r.userId?.name || "";
    const empId = r.userId?.employeeId || "";
    return (
      name.toLowerCase().includes(adminSearch.toLowerCase()) ||
      empId.toLowerCase().includes(adminSearch.toLowerCase())
    );
  });

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto text-foreground">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Attendance Logs</h1>
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          {isAdmin ? "Track daily work hours and check-ins across the team" : "Review your monthly check-in history and timesheet details"}
        </p>
      </div>

      {/* ADMIN VIEW */}
      {isAdmin ? (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Admin Control Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold uppercase tracking-wider text-muted">Selected Date:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 rounded-xl text-xs text-foreground outline-none border transition-all"
                style={{ background: "var(--card)", borderColor: "var(--card-border)", colorScheme: "dark" }}
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="text"
                  placeholder="Search name or ID..."
                  value={adminSearch}
                  onChange={(e) => setAdminSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 rounded-xl text-xs text-foreground outline-none border w-full sm:w-60"
                  style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
                />
              </div>

              <button
                onClick={fetchAttendanceData}
                className="p-2 border rounded-xl hover:bg-slate-500/5 transition-all text-slate-400 hover:text-white cursor-pointer"
                style={{ borderColor: "var(--card-border)" }}
                title="Refresh"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {/* Daily Table list */}
          <div className="rounded-2xl border overflow-hidden glass-panel">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs min-w-[650px]">
                <thead>
                  <tr className="border-b" style={{ borderColor: "var(--card-border)", background: "rgba(255,255,255,0.02)" }}>
                    <th className="p-4 font-bold text-foreground uppercase tracking-wider text-[10px]">Employee</th>
                    <th className="p-4 font-bold text-foreground uppercase tracking-wider text-[10px]">ID / Department</th>
                    <th className="p-4 font-bold text-foreground uppercase tracking-wider text-[10px]">Check In</th>
                    <th className="p-4 font-bold text-foreground uppercase tracking-wider text-[10px]">Check Out</th>
                    <th className="p-4 font-bold text-foreground uppercase tracking-wider text-[10px]">Work Hours</th>
                    <th className="p-4 font-bold text-foreground uppercase tracking-wider text-[10px]">Extra Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {filteredRecords.map((r) => {
                    const hours = computeHours(r.checkIn, r.checkOut);
                    return (
                      <tr key={r._id} className="hover:bg-slate-100/5 dark:hover:bg-white/[0.01] transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-foreground">{r.userId?.name || "Unknown User"}</div>
                          <div className="text-[10px] mt-0.5" style={{ color: "var(--muted)" }}>{r.userId?.employeeId}</div>
                        </td>
                        <td className="p-4 text-foreground font-medium">{r.userId?.department || "—"}</td>
                        <td className="p-4 font-mono font-bold text-foreground">
                          {r.checkIn ? new Date(r.checkIn).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}
                        </td>
                        <td className="p-4 font-mono font-bold text-foreground">
                          {r.checkOut ? new Date(r.checkOut).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}
                        </td>
                        <td className="p-4 font-mono font-bold text-indigo-400">{hours.work}</td>
                        <td className="p-4 font-mono font-bold text-emerald-400">{hours.extra}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredRecords.length === 0 && (
              <div className="text-center py-16 flex flex-col items-center justify-center">
                <Inbox className="w-12 h-12 text-slate-500 mb-3" />
                <p className="text-sm font-medium" style={{ color: "var(--muted)" }}>
                  No attendance records logged for {selectedDate}.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* EMPLOYEE VIEW */
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Summary Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { label: "Days Present", val: stats.presentCount, desc: "Records logged in month" },
                { label: "Leaves count", val: stats.leavesCount, desc: "Approved leave days" },
                { label: "Total working days", val: stats.totalWorkingDays, desc: "Weekdays in month" },
              ].map((card, idx) => (
                <div key={idx} className="rounded-2xl p-5 border glass-panel flex flex-col justify-between"
                  style={{ borderColor: "var(--card-border)" }}>
                  <div className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "var(--muted)" }}>{card.label}</div>
                  <div className="text-3xl font-extrabold text-foreground mt-4 font-precise">{card.val}</div>
                  <div className="text-[10px] mt-2" style={{ color: "var(--muted)", opacity: 0.8 }}>{card.desc}</div>
                </div>
              ))}
            </div>
          )}

          {/* Monthly navigation controller */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => adjustMonth(-1)}
                className="p-2 border rounded-xl hover:bg-slate-500/5 transition-all text-slate-400 hover:text-white cursor-pointer"
                style={{ borderColor: "var(--card-border)" }}
              >
                <ChevronLeft size={16} />
              </button>
              <span className="font-bold text-sm text-foreground capitalize min-w-[140px] text-center font-precise">
                {currentMonth.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
              </span>
              <button
                onClick={() => adjustMonth(1)}
                className="p-2 border rounded-xl hover:bg-slate-500/5 transition-all text-slate-400 hover:text-white cursor-pointer"
                style={{ borderColor: "var(--card-border)" }}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <button
              onClick={fetchAttendanceData}
              className="p-2 border rounded-xl hover:bg-slate-500/5 transition-all text-slate-400 hover:text-white cursor-pointer"
              style={{ borderColor: "var(--card-border)" }}
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {/* Employee Timesheet Table list */}
          <div className="rounded-2xl border overflow-hidden glass-panel">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs min-w-[550px]">
                <thead>
                  <tr className="border-b" style={{ borderColor: "var(--card-border)", background: "rgba(255,255,255,0.02)" }}>
                    <th className="p-4 font-bold text-foreground uppercase tracking-wider text-[10px]">Date</th>
                    <th className="p-4 font-bold text-foreground uppercase tracking-wider text-[10px]">Check In</th>
                    <th className="p-4 font-bold text-foreground uppercase tracking-wider text-[10px]">Check Out</th>
                    <th className="p-4 font-bold text-foreground uppercase tracking-wider text-[10px]">Work Hours</th>
                    <th className="p-4 font-bold text-foreground uppercase tracking-wider text-[10px]">Extra Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {records.map((r) => {
                    const hours = computeHours(r.checkIn, r.checkOut);
                    return (
                      <tr key={r._id} className="hover:bg-slate-100/5 dark:hover:bg-white/[0.01] transition-colors">
                        <td className="p-4 font-bold text-foreground">
                          {new Date(r.date + "T00:00:00").toLocaleDateString("en-IN", {
                            weekday: "short",
                            day: "numeric",
                            month: "short"
                          })}
                        </td>
                        <td className="p-4 font-mono font-bold text-foreground">
                          {r.checkIn ? new Date(r.checkIn).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}
                        </td>
                        <td className="p-4 font-mono font-bold text-foreground">
                          {r.checkOut ? new Date(r.checkOut).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}
                        </td>
                        <td className="p-4 font-mono font-bold text-indigo-400">{hours.work}</td>
                        <td className="p-4 font-mono font-bold text-emerald-400">{hours.extra}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {records.length === 0 && (
              <div className="text-center py-16 flex flex-col items-center justify-center">
                <Inbox className="w-12 h-12 text-slate-500 mb-3" />
                <p className="text-sm font-medium" style={{ color: "var(--muted)" }}>
                  No attendance records found for this month.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
