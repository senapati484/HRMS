"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  ShieldAlert, 
  Users, 
  Palmtree, 
  CircleDollarSign, 
  AlertTriangle, 
  UserCheck, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  User,
  Inbox
} from "lucide-react";

interface UserType {
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

function AdminDashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [employees, setEmployees] = useState<UserType[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);

  // Sync active tab from URL ?tab= param — sidebar links set this
  const activeTab = (searchParams.get("tab") || "employees") as
    | "employees"
    | "leaves"
    | "anomalies"
    | "payroll";

  function setActiveTab(tab: string) {
    router.push(`/admin?tab=${tab}`);
  }

  // Selection states for payroll updating
  const [selectedEmp, setSelectedEmp] = useState<UserType | null>(null);
  const [payrollForm, setPayrollForm] = useState({ basic: 0, allowances: 0, deductions: 0 });
  const [payrollMsg, setPayrollMsg] = useState("");
  const [payrollLoading, setPayrollLoading] = useState(false);

  // Leave comment state
  const [hrComment, setHrComment] = useState("");
  const [decisionLoading, setDecisionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const resEmp = await fetch("/api/users");
      const dataEmp = await resEmp.json();
      if (dataEmp.users) setEmployees(dataEmp.users);

      const resLeaves = await fetch("/api/leave?all=true");
      const dataLeaves = await resLeaves.json();
      if (dataLeaves.leaves) setLeaves(dataLeaves.leaves);

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

  async function handleSelectEmployeeForPayroll(emp: UserType) {
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
    <div className="p-6 space-y-6 max-w-6xl mx-auto text-white">
      {/* Page title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}>
              <ShieldAlert size={16} />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">HR Control Center</h1>
          </div>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Review pending leaves, update payroll parameters, track anomalies and verify employee records
          </p>
        </div>
        <span
          className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full font-precise border self-start sm:self-center"
          style={{ background: "rgba(239,68,68,0.08)", color: "var(--danger)", borderColor: "rgba(239,68,68,0.2)" }}
        >
          Administrator Account
        </span>
      </div>

      <div>
        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b mb-6 overflow-x-auto" style={{ borderColor: "var(--card-border)" }}>
          {[
            { id: "employees", label: "Employees", count: employees.length },
            { id: "leaves", label: "Pending Leaves", count: pendingLeaves.length },
            { id: "anomalies", label: "Anomaly Alerts", count: anomalies.length },
            { id: "payroll", label: "Payroll Manager" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className="px-4 py-3.5 text-sm font-semibold border-b-2 transition-all relative whitespace-nowrap cursor-pointer font-precise"
              style={{
                borderColor: activeTab === tab.id ? "var(--primary)" : "transparent",
                color: activeTab === tab.id ? "white" : "var(--muted)",
              }}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className="ml-2 text-[10px] px-2 py-0.5 rounded-full font-bold font-mono inline-block shadow-sm"
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
          <div className="rounded-2xl border overflow-hidden glass-panel">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b" style={{ borderColor: "var(--card-border)", background: "rgba(255,255,255,0.02)" }}>
                    <th className="p-4 font-bold text-white uppercase tracking-wider text-xs font-precise">Employee</th>
                    <th className="p-4 font-bold text-white uppercase tracking-wider text-xs font-precise">ID / Role</th>
                    <th className="p-4 font-bold text-white uppercase tracking-wider text-xs font-precise">Department</th>
                    <th className="p-4 font-bold text-white uppercase tracking-wider text-xs font-precise">Designation</th>
                    <th className="p-4 font-bold text-white uppercase tracking-wider text-xs font-precise">Status</th>
                    <th className="p-4 font-bold text-white uppercase tracking-wider text-xs font-precise text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {employees.map((emp) => (
                    <tr key={emp._id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-white">{emp.name}</div>
                        <div className="text-xs font-mono" style={{ color: "var(--muted)" }}>
                          {emp.email}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-white font-semibold font-mono">{emp.employeeId}</div>
                        <div className="text-xs uppercase font-bold tracking-wider font-precise text-indigo-400 mt-0.5">
                          {emp.role}
                        </div>
                      </td>
                      <td className="p-4 text-white font-medium">{emp.department || "—"}</td>
                      <td className="p-4 text-white font-medium">{emp.designation || "—"}</td>
                      <td className="p-4">
                        <span
                          className="text-[10px] px-2.5 py-0.5 rounded-full font-bold border uppercase tracking-wider font-precise"
                          style={{
                            background: emp.isVerified ? "rgba(16, 185, 129, 0.08)" : "rgba(245, 158, 11, 0.08)",
                            color: emp.isVerified ? "var(--success)" : "var(--warning)",
                            borderColor: emp.isVerified ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)",
                          }}
                        >
                          {emp.isVerified ? "Verified" : "Pending Approval"}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {!emp.isVerified && (
                          <button
                            onClick={() => handleVerify(emp._id)}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all cursor-pointer shadow-md shadow-indigo-600/10 font-precise uppercase tracking-wider"
                          >
                            Verify Account
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "leaves" && (
          <div className="space-y-4">
            {pendingLeaves.length === 0 ? (
              <div className="text-center py-16 border rounded-2xl glass-panel flex flex-col items-center justify-center">
                <Inbox className="w-12 h-12 text-slate-500 mb-3" />
                <p style={{ color: "var(--muted)" }} className="text-sm font-medium">
                  No pending leave requests registered.
                </p>
              </div>
            ) : (
              pendingLeaves.map((l) => (
                <div
                  key={l._id}
                  className="rounded-2xl p-6 flex flex-col md:flex-row justify-between gap-6 glass-panel"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-2.5">
                      <h3 className="font-bold text-white text-base">{l.userId?.name || "Unknown"}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold font-mono" style={{ background: "rgba(99, 102, 241, 0.15)", color: "var(--primary)" }}>
                        {l.userId?.employeeId || "—"}
                      </span>
                    </div>
                    <p className="text-sm text-slate-200">
                      Requested <strong className="text-indigo-300 font-precise">{l.leaveType} Leave</strong>
                      <span className="text-slate-400 font-mono text-xs mx-1">
                        ({new Date(l.startDate).toLocaleDateString("en-IN")} to {new Date(l.endDate).toLocaleDateString("en-IN")})
                      </span>
                    </p>
                    {l.remarks && (
                      <p className="text-xs bg-slate-950/40 p-3 rounded-lg border border-white/5 font-mono max-w-2xl" style={{ color: "var(--muted)" }}>
                        Reason: &quot;{l.remarks}&quot;
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 min-w-[280px] self-end md:self-center">
                    <input
                      type="text"
                      placeholder="Comment / Reason (optional)"
                      value={hrComment}
                      onChange={(e) => setHrComment(e.target.value)}
                      className="px-3.5 py-2.5 rounded-xl text-xs text-white outline-none w-full"
                      style={{ background: "#0f1117", border: "1px solid var(--card-border)" }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleLeaveDecision(l._id, "Approved")}
                        disabled={decisionLoading !== null}
                        className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all disabled:opacity-50 cursor-pointer uppercase tracking-wider font-precise shadow-md shadow-emerald-950/20"
                      >
                        {decisionLoading === l._id ? "..." : "Approve"}
                      </button>
                      <button
                        onClick={() => handleLeaveDecision(l._id, "Rejected")}
                        disabled={decisionLoading !== null}
                        className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-all disabled:opacity-50 cursor-pointer uppercase tracking-wider font-precise shadow-md shadow-red-950/20"
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
            <div className="p-4 rounded-xl text-xs bg-amber-950/20 border border-amber-500/20 text-amber-200 flex items-start gap-2">
              <AlertCircle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Operational Intelligence Alerts:</strong> Flags generated automatically based on stale leave approval delays (7+ days pending) and abnormal absence thresholds (3+ absences this month).
              </div>
            </div>
            {anomalies.length === 0 ? (
              <div className="text-center py-16 border rounded-2xl glass-panel flex flex-col items-center justify-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3" />
                <p style={{ color: "var(--muted)" }} className="text-sm font-medium">
                  Zero operational anomalies flagged. System status clean.
                </p>
              </div>
            ) : (
              anomalies.map((anom, i) => (
                <div
                  key={i}
                  className="rounded-2xl p-5 flex items-start gap-4 glass-panel border-l-4"
                  style={{
                    borderLeftColor: anom.type === "stale_leave" ? "var(--warning)" : "var(--danger)",
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      background: anom.type === "stale_leave" ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)",
                      color: anom.type === "stale_leave" ? "var(--warning)" : "var(--danger)",
                    }}
                  >
                    {anom.type === "stale_leave" ? <Clock size={16} /> : <AlertTriangle size={16} />}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-white text-sm font-precise">
                      {anom.type === "stale_leave" ? "Stale Leave Request Delay" : "Abnormal Absence Threshold"}: {anom.employeeName}
                    </h3>
                    <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                      {anom.detail}
                    </p>
                    {anom.type === "stale_leave" && (
                      <button
                        onClick={() => setActiveTab("leaves")}
                        className="text-xs text-indigo-400 font-bold hover:underline mt-2.5 flex items-center gap-1 cursor-pointer font-precise"
                      >
                        Navigate to approval board <ArrowRight size={12} />
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
            <div className="lg:col-span-1 border rounded-2xl overflow-hidden glass-panel">
              <div
                className="p-4 border-b font-bold text-sm tracking-wide font-precise uppercase flex items-center gap-2"
                style={{ borderColor: "var(--card-border)", background: "rgba(255,255,255,0.02)" }}
              >
                <Users size={16} className="text-indigo-400" />
                Select Employee
              </div>
              <div className="divide-y divide-white/5 max-h-[480px] overflow-y-auto">
                {employees.map((emp) => (
                  <button
                    key={emp._id}
                    onClick={() => handleSelectEmployeeForPayroll(emp)}
                    className="w-full p-4 text-left transition-all hover:bg-white/[0.01] flex flex-col gap-1 cursor-pointer border-l-2 border-transparent"
                    style={{ 
                      background: selectedEmp?._id === emp._id ? "rgba(99,102,241,0.08)" : "transparent",
                      borderLeftColor: selectedEmp?._id === emp._id ? "var(--primary)" : "transparent"
                    }}
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
                <div className="rounded-2xl p-6 space-y-6 glass-panel">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                        <User size={14} />
                      </div>
                      <h3 className="text-base font-bold text-white font-precise">Payroll configuration</h3>
                    </div>
                    <p style={{ color: "var(--muted)" }} className="text-xs">
                      Setting parameters for <strong className="text-white">{selectedEmp.name}</strong> ({selectedEmp.employeeId})
                    </p>
                  </div>

                  {payrollMsg && (
                    <div
                      className="p-4 rounded-xl text-sm font-semibold border flex items-center gap-2"
                      style={{
                        background: payrollMsg.startsWith("✓") ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
                        color: payrollMsg.startsWith("✓") ? "var(--success)" : "var(--danger)",
                        borderColor: payrollMsg.startsWith("✓") ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"
                      }}
                    >
                      {payrollMsg.startsWith("✓") ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                      {payrollMsg}
                    </div>
                  )}

                  <form onSubmit={handleUpdatePayroll} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--muted)" }}>
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
                      <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--muted)" }}>
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
                      <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--muted)" }}>
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

                    <div className="border-t pt-5 flex justify-between items-center" style={{ borderColor: "var(--card-border)" }}>
                      <span className="font-bold text-white text-xs font-precise uppercase tracking-wider">Estimated Net Salary</span>
                      <span className="font-bold text-lg text-emerald-400 font-mono">
                        ₹{(payrollForm.basic + payrollForm.allowances - payrollForm.deductions).toLocaleString("en-IN")}
                      </span>
                    </div>

                    <button
                      type="submit"
                      disabled={payrollLoading}
                      className="px-6 py-3 rounded-xl font-bold text-white text-sm disabled:opacity-60 cursor-pointer transition-all hover:scale-[1.01]"
                      style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
                    >
                      {payrollLoading ? "Updating..." : "Save Payroll Settings"}
                    </button>
                  </form>
                </div>
              ) : (
                <div
                  className="border rounded-2xl p-16 text-center glass-panel flex flex-col items-center justify-center"
                  style={{ color: "var(--muted)" }}
                >
                  <CircleDollarSign className="w-12 h-12 text-slate-500 mb-3" />
                  <p className="text-sm font-semibold">Select an employee from the list to update parameters.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-white animate-pulse font-medium">Loading control panel...</div>
      </div>
    }>
      <AdminDashboard />
    </Suspense>
  );
}
