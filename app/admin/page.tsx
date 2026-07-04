"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";

interface User {
  _id: string;
  name: string;
  employeeId: string;
  email: string;
  role: string;
  department?: string;
  designation?: string;
  isVerified: boolean;
}

interface LeaveRequest {
  _id: string;
  userId: {
    _id: string;
    name: string;
    employeeId: string;
  } | null;
  leaveType: string;
  startDate: string;
  endDate: string;
  remarks?: string;
  status: string;
}

interface Anomaly {
  type: string;
  employeeName: string;
  detail: string;
  refId?: string;
}

export default function AdminDashboard() {
  const [employees, setEmployees] = useState<User[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [activeTab, setActiveTab] = useState<"employees" | "leaves" | "anomalies" | "payroll">("employees");

  // Selection states for payroll updating
  const [selectedEmp, setSelectedEmp] = useState<User | null>(null);
  const [payrollForm, setPayrollForm] = useState({ basic: 0, allowances: 0, deductions: 0 });
  const [payrollMsg, setPayrollMsg] = useState("");
  const [payrollLoading, setPayrollLoading] = useState(false);

  // Leave comment state
  const [hrComment, setHrComment] = useState("");
  const [decisionLoading, setDecisionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      // 1. Fetch employees
      const resEmp = await fetch("/api/users");
      const dataEmp = await resEmp.json();
      if (dataEmp.users) setEmployees(dataEmp.users);

      // 2. Fetch pending leaves
      const resLeaves = await fetch("/api/leave");
      const dataLeaves = await resLeaves.json();
      if (dataLeaves.leaves) setLeaves(dataLeaves.leaves);

      // 3. Fetch copilot anomaly flags
      const resAnom = await fetch("/api/copilot/anomalies");
      const dataAnom = await resAnom.json();
      if (dataAnom.flags) setAnomalies(dataAnom.flags);
    } catch (err) {
      console.error("Error fetching admin data:", err);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle verify employee
  async function handleVerify(userId: string) {
    const res = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) {
      fetchData();
    }
  }

  // Handle leave approval / rejection
  async function handleLeaveDecision(leaveId: string, status: "Approved" | "Rejected") {
    setDecisionLoading(leaveId);
    try {
      const res = await fetch(`/api/leave/${leaveId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, hrComment }),
      });
      if (res.ok) {
        setHrComment("");
        fetchData();
      }
    } finally {
      setDecisionLoading(null);
    }
  }

  // Handle select employee for payroll
  async function handleSelectEmployeeForPayroll(emp: User) {
    setSelectedEmp(emp);
    setPayrollMsg("");
    try {
      const res = await fetch(`/api/payroll/${emp._id}`);
      const data = await res.json();
      if (data.payroll) {
        setPayrollForm({
          basic: data.payroll.basic || 0,
          allowances: data.payroll.allowances || 0,
          deductions: data.payroll.deductions || 0,
        });
      } else {
        setPayrollForm({ basic: 0, allowances: 0, deductions: 0 });
      }
    } catch {
      setPayrollForm({ basic: 0, allowances: 0, deductions: 0 });
    }
  }

  // Handle update payroll
  async function handleUpdatePayroll(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEmp) return;
    setPayrollLoading(true);
    setPayrollMsg("");
    try {
      const res = await fetch(`/api/payroll/${selectedEmp._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payrollForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setPayrollMsg(data.error || "Failed to update payroll");
      } else {
        setPayrollMsg("✓ Payroll updated successfully!");
      }
    } catch (err) {
      setPayrollMsg((err as Error).message || "Failed to update payroll");
    } finally {
      setPayrollLoading(false);
    }
  }

  const pendingLeaves = leaves.filter((l) => l.status === "Pending");

  return (
    <div className="min-h-screen text-white" style={{ background: "var(--background)" }}>
      {/* Header */}
      <header
        className="border-b px-6 py-4 flex items-center justify-between"
        style={{ borderColor: "var(--card-border)", background: "var(--card)" }}
      >
        <div>
          <h1 className="text-lg font-bold text-white">HR Admin Portal 🛡️</h1>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            Management, Policy Approval, and Anomaly Tracking
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="text-xs px-3 py-1 rounded-full font-medium"
            style={{ background: "rgba(239,68,68,0.15)", color: "var(--danger)" }}
          >
            Administrator
          </span>
          <LogoutButton />
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b" style={{ borderColor: "var(--card-border)" }}>
          {[
            { id: "employees", label: "Employees", count: employees.length },
            { id: "leaves", label: "Pending Leaves", count: pendingLeaves.length },
            { id: "anomalies", label: "Anomaly Alerts", count: anomalies.length },
            { id: "payroll", label: "Payroll Manager" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className="px-4 py-3 text-sm font-medium border-b-2 transition-all relative"
              style={{
                borderColor: activeTab === tab.id ? "var(--primary)" : "transparent",
                color: activeTab === tab.id ? "white" : "var(--muted)",
              }}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className="ml-2 text-xs px-1.5 py-0.5 rounded-full font-bold"
                  style={{
                    background: tab.id === "anomalies" ? "var(--danger)" : "var(--primary)",
                    color: "white",
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        {activeTab === "employees" && (
          <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--card-border)", background: "#131620" }}>
                  <th className="p-4 font-semibold text-white">Employee</th>
                  <th className="p-4 font-semibold text-white">ID / Role</th>
                  <th className="p-4 font-semibold text-white">Department</th>
                  <th className="p-4 font-semibold text-white">Designation</th>
                  <th className="p-4 font-semibold text-white">Status</th>
                  <th className="p-4 font-semibold text-white">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--card-border)" }}>
                {employees.map((emp) => (
                  <tr key={emp._id} className="hover:bg-slate-800/20">
                    <td className="p-4">
                      <div className="font-semibold text-white">{emp.name}</div>
                      <div className="text-xs" style={{ color: "var(--muted)" }}>
                        {emp.email}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-white font-medium">{emp.employeeId}</div>
                      <div className="text-xs" style={{ color: "var(--muted)" }}>
                        {emp.role}
                      </div>
                    </td>
                    <td className="p-4 text-white">{emp.department || "—"}</td>
                    <td className="p-4 text-white">{emp.designation || "—"}</td>
                    <td className="p-4">
                      <span
                        className="text-xs px-2.5 py-0.5 rounded-full font-semibold"
                        style={{
                          background: emp.isVerified ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                          color: emp.isVerified ? "var(--success)" : "var(--warning)",
                        }}
                      >
                        {emp.isVerified ? "Verified" : "Pending Verification"}
                      </span>
                    </td>
                    <td className="p-4">
                      {!emp.isVerified && (
                        <button
                          onClick={() => handleVerify(emp._id)}
                          className="px-3 py-1 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all"
                        >
                          Verify
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "leaves" && (
          <div className="space-y-4">
            {pendingLeaves.length === 0 ? (
              <div className="text-center py-12 border rounded-2xl" style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
                <p style={{ color: "var(--muted)" }} className="text-sm">No pending leave requests found.</p>
              </div>
            ) : (
              pendingLeaves.map((l) => (
                <div
                  key={l._id}
                  className="rounded-2xl border p-6 flex flex-col md:flex-row justify-between gap-6"
                  style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white">{l.userId?.name || "Unknown"}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(99, 102, 241, 0.15)", color: "var(--primary)" }}>
                        {l.userId?.employeeId || "—"}
                      </span>
                    </div>
                    <p className="text-sm">
                      <strong className="text-white">{l.leaveType} Leave</strong> ·{" "}
                      {new Date(l.startDate).toLocaleDateString("en-IN")} to {new Date(l.endDate).toLocaleDateString("en-IN")}
                    </p>
                    {l.remarks && <p className="text-sm text-gray-400 font-serif italic">🗣️ &quot;{l.remarks}&quot;</p>}
                  </div>

                  <div className="flex flex-col gap-3 min-w-[280px]">
                    <input
                      type="text"
                      placeholder="Comment / Reason (optional)"
                      value={hrComment}
                      onChange={(e) => setHrComment(e.target.value)}
                      className="px-3 py-2 rounded-lg text-xs text-white outline-none w-full"
                      style={{ background: "#0f1117", border: "1px solid var(--card-border)" }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleLeaveDecision(l._id, "Approved")}
                        disabled={decisionLoading !== null}
                        className="flex-1 py-2 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-all disabled:opacity-50"
                      >
                        {decisionLoading === l._id ? "..." : "Approve"}
                      </button>
                      <button
                        onClick={() => handleLeaveDecision(l._id, "Rejected")}
                        disabled={decisionLoading !== null}
                        className="flex-1 py-2 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-all disabled:opacity-50"
                      >
                        {decisionLoading === l._id ? "..." : "Reject"}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "anomalies" && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl text-xs bg-indigo-950/20 border border-indigo-500/20 text-indigo-200">
              ⚡ <strong>Real-time AI/Rule Anomaly Alerts:</strong> Flags generated automatically based on stale leave approval delays and abnormal absence thresholds (3+ absences this month).
            </div>
            {anomalies.length === 0 ? (
              <div className="text-center py-12 border rounded-2xl" style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
                <p style={{ color: "var(--muted)" }} className="text-sm">No operational anomalies detected.</p>
              </div>
            ) : (
              anomalies.map((anom, i) => (
                <div
                  key={i}
                  className="rounded-2xl border p-5 flex items-start gap-4"
                  style={{
                    background: "var(--card)",
                    borderColor: "var(--card-border)",
                    borderLeft: `4px solid ${anom.type === "stale_leave" ? "var(--warning)" : "var(--danger)"}`,
                  }}
                >
                  <span className="text-xl">{anom.type === "stale_leave" ? "⏳" : "🚨"}</span>
                  <div>
                    <h3 className="font-bold text-white text-sm">
                      {anom.type === "stale_leave" ? "Pending Leave Delay" : "High Absence Count"}: {anom.employeeName}
                    </h3>
                    <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                      {anom.detail}
                    </p>
                    {anom.type === "stale_leave" && (
                      <button
                        onClick={() => setActiveTab("leaves")}
                        className="text-xs text-indigo-400 font-semibold underline mt-2 block"
                      >
                        Take Action in Leaves →
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "payroll" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* List */}
            <div className="lg:col-span-1 border rounded-2xl overflow-hidden" style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
              <div className="p-4 border-b font-semibold text-sm" style={{ borderColor: "var(--card-border)" }}>
                Select Employee
              </div>
              <div className="divide-y" style={{ borderColor: "var(--card-border)" }}>
                {employees.map((emp) => (
                  <button
                    key={emp._id}
                    onClick={() => handleSelectEmployeeForPayroll(emp)}
                    className="w-full p-4 text-left transition-all hover:bg-slate-800/25 flex flex-col gap-1"
                    style={{ background: selectedEmp?._id === emp._id ? "#151824" : "transparent" }}
                  >
                    <span className="font-bold text-sm text-white">{emp.name}</span>
                    <span className="text-xs" style={{ color: "var(--muted)" }}>
                      {emp.department} · {emp.employeeId}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Editor */}
            <div className="lg:col-span-2">
              {selectedEmp ? (
                <div className="border rounded-2xl p-6 space-y-6" style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
                  <div>
                    <h3 className="text-lg font-bold text-white">Payroll Setup for {selectedEmp.name}</h3>
                    <p style={{ color: "var(--muted)" }} className="text-xs">
                      Update components of salary. Take-home net salary is computed automatically.
                    </p>
                  </div>

                  {payrollMsg && (
                    <div
                      className="p-3 rounded-lg text-sm"
                      style={{
                        background: payrollMsg.startsWith("✓") ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                        color: payrollMsg.startsWith("✓") ? "var(--success)" : "var(--danger)",
                      }}
                    >
                      {payrollMsg}
                    </div>
                  )}

                  <form onSubmit={handleUpdatePayroll} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold mb-2" style={{ color: "var(--muted)" }}>
                        Basic Salary (Monthly)
                      </label>
                      <input
                        type="number"
                        required
                        value={payrollForm.basic}
                        onChange={(e) => setPayrollForm((f) => ({ ...f, basic: Number(e.target.value) }))}
                        className="w-full px-4 py-2.5 rounded-xl text-sm text-white outline-none"
                        style={{ background: "#0f1117", border: "1px solid var(--card-border)" }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-2" style={{ color: "var(--muted)" }}>
                        Allowances (Monthly)
                      </label>
                      <input
                        type="number"
                        required
                        value={payrollForm.allowances}
                        onChange={(e) => setPayrollForm((f) => ({ ...f, allowances: Number(e.target.value) }))}
                        className="w-full px-4 py-2.5 rounded-xl text-sm text-white outline-none"
                        style={{ background: "#0f1117", border: "1px solid var(--card-border)" }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-2" style={{ color: "var(--muted)" }}>
                        Deductions (Monthly)
                      </label>
                      <input
                        type="number"
                        required
                        value={payrollForm.deductions}
                        onChange={(e) => setPayrollForm((f) => ({ ...f, deductions: Number(e.target.value) }))}
                        className="w-full px-4 py-2.5 rounded-xl text-sm text-white outline-none"
                        style={{ background: "#0f1117", border: "1px solid var(--card-border)" }}
                      />
                    </div>

                    <div className="border-t pt-4 flex justify-between items-center" style={{ borderColor: "var(--card-border)" }}>
                      <span className="font-semibold text-white text-sm">Estimated Take-home Pay</span>
                      <span className="font-bold text-lg text-emerald-400">
                        ₹{(payrollForm.basic + payrollForm.allowances - payrollForm.deductions).toLocaleString("en-IN")}
                      </span>
                    </div>

                    <button
                      type="submit"
                      disabled={payrollLoading}
                      className="px-6 py-3 rounded-xl font-semibold text-white text-sm disabled:opacity-60"
                      style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
                    >
                      {payrollLoading ? "Updating..." : "Save Payroll Settings"}
                    </button>
                  </form>
                </div>
              ) : (
                <div
                  className="border rounded-2xl p-12 text-center"
                  style={{ background: "var(--card)", borderColor: "var(--card-border)", color: "var(--muted)" }}
                >
                  Select an employee from the list to manage their payroll profile.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
