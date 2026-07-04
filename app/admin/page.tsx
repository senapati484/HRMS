"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useDataStore } from "@/lib/store/dataStore";
import { 
  ShieldAlert, 
  Users, 
  Palmtree, 
  CircleDollarSign, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  User,
  Inbox,
  DollarSign,
  LayoutDashboard
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
  employmentType?: string;
  workLocation?: string;
  status?: string;
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

const EMPTY: [] = [];

function AdminDashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const employees = useDataStore((s) => s._employees?.data ?? EMPTY) as UserType[];
  const leaves = useDataStore((s) => s._leaves?.data ?? EMPTY) as LeaveRequest[];
  const anomalies = useDataStore((s) => s._anomalies?.data ?? EMPTY) as Anomaly[];
  const fetchAdminAll = useDataStore((s) => s.fetchAdminAll);
  const invalidateLeaves = useDataStore((s) => s.invalidateLeaves);

  const [activeTab, setActiveTabState] = useState<"dashboard" | "employees" | "leaves" | "anomalies" | "payroll">("dashboard");

  const paramTab = searchParams.get("tab");
  useEffect(() => {
    if (paramTab) {
      setActiveTabState(paramTab as any);
    } else {
      setActiveTabState("dashboard");
    }
  }, [paramTab]);

  const [selectedEmp, setSelectedEmp] = useState<UserType | null>(null);
  const [payrollForm, setPayrollForm] = useState({
    monthlyWage: 0,
    workingDaysPerWeek: 5,
    breakTime: 1,
    basic: 0,
    hra: 0,
    standardAllowance: 0,
    performanceBonus: 0,
    leaveTravelAllowance: 0,
    fixedAllowance: 0,
    employeePF: 0,
    employerPF: 0,
    professionalTax: 200,
    allowances: 0,
    deductions: 0,
    bonus: 0,
    payCycle: "monthly",
    currency: "INR",
    taxId: "",
    pfNumber: "",
    esiNumber: "",
  });
  
  function handleWageChange(wage: number) {
    const basic = Math.round(wage * 0.5 * 100) / 100;
    const hra = Math.round(basic * 0.5 * 100) / 100;
    const standardAllowance = Math.round(wage * 0.0833 * 100) / 100;
    const performanceBonus = Math.round(wage * 0.0833 * 100) / 100;
    const leaveTravelAllowance = Math.round(wage * 0.0833 * 100) / 100;
    
    const sumOther = basic + hra + standardAllowance + performanceBonus + leaveTravelAllowance;
    const fixedAllowance = Math.max(0, Math.round((wage - sumOther) * 100) / 100);

    const employeePF = Math.round(basic * 0.12 * 100) / 100;
    const employerPF = Math.round(basic * 0.12 * 100) / 100;

    setPayrollForm((prev) => ({
      ...prev,
      monthlyWage: wage,
      basic,
      hra,
      standardAllowance,
      performanceBonus,
      leaveTravelAllowance,
      fixedAllowance,
      employeePF,
      employerPF,
      allowances: hra + standardAllowance + performanceBonus + leaveTravelAllowance + fixedAllowance,
      deductions: employeePF + 200,
    }));
  }

  const [payrollMsg, setPayrollMsg] = useState("");
  const [payrollLoading, setPayrollLoading] = useState(false);

  const [hrComment, setHrComment] = useState("");
  const [decisionLoading, setDecisionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminAll();
  }, [fetchAdminAll]);

  async function handleVerify(userId: string) {
    const res = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) {
      await fetchAdminAll(true);
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
        invalidateLeaves();
        await fetchAdminAll(true);
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
          monthlyWage: data.payroll.monthlyWage || 0,
          workingDaysPerWeek: data.payroll.workingDaysPerWeek || 5,
          breakTime: data.payroll.breakTime || 1,
          basic: data.payroll.basic || 0,
          hra: data.payroll.hra || 0,
          standardAllowance: data.payroll.standardAllowance || 0,
          performanceBonus: data.payroll.performanceBonus || 0,
          leaveTravelAllowance: data.payroll.leaveTravelAllowance || 0,
          fixedAllowance: data.payroll.fixedAllowance || 0,
          employeePF: data.payroll.employeePF || 0,
          employerPF: data.payroll.employerPF || 0,
          professionalTax: data.payroll.professionalTax || 200,
          allowances: data.payroll.allowances || 0,
          deductions: data.payroll.deductions || 0,
          bonus: data.payroll.bonus || 0,
          payCycle: data.payroll.payCycle || "monthly",
          currency: data.payroll.currency || "INR",
          taxId: data.payroll.taxId || "",
          pfNumber: data.payroll.pfNumber || "",
          esiNumber: data.payroll.esiNumber || "",
        });
      } else {
        setPayrollForm({
          monthlyWage: 0,
          workingDaysPerWeek: 5,
          breakTime: 1,
          basic: 0,
          hra: 0,
          standardAllowance: 0,
          performanceBonus: 0,
          leaveTravelAllowance: 0,
          fixedAllowance: 0,
          employeePF: 0,
          employerPF: 0,
          professionalTax: 200,
          allowances: 0,
          deductions: 0,
          bonus: 0,
          payCycle: "monthly",
          currency: "INR",
          taxId: "",
          pfNumber: "",
          esiNumber: "",
        });
      }
    } catch {
      setPayrollForm({
        monthlyWage: 0,
        workingDaysPerWeek: 5,
        breakTime: 1,
        basic: 0,
        hra: 0,
        standardAllowance: 0,
        performanceBonus: 0,
        leaveTravelAllowance: 0,
        fixedAllowance: 0,
        employeePF: 0,
        employerPF: 0,
        professionalTax: 200,
        allowances: 0,
        deductions: 0,
        bonus: 0,
        payCycle: "monthly",
        currency: "INR",
        taxId: "",
        pfNumber: "",
        esiNumber: "",
      });
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
        body: JSON.stringify({
          monthlyWage: payrollForm.monthlyWage,
          workingDaysPerWeek: payrollForm.workingDaysPerWeek,
          breakTime: payrollForm.breakTime,
          bonus: payrollForm.bonus,
          payCycle: payrollForm.payCycle,
          currency: payrollForm.currency,
          taxId: payrollForm.taxId,
          pfNumber: payrollForm.pfNumber,
          esiNumber: payrollForm.esiNumber,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPayrollMsg(data.error || "Failed to update payroll");
      } else {
        setPayrollMsg("✓ Payroll updated successfully!");
        if (data.payroll) {
          setPayrollForm({
            monthlyWage: data.payroll.monthlyWage || 0,
            workingDaysPerWeek: data.payroll.workingDaysPerWeek || 5,
            breakTime: data.payroll.breakTime || 1,
            basic: data.payroll.basic || 0,
            hra: data.payroll.hra || 0,
            standardAllowance: data.payroll.standardAllowance || 0,
            performanceBonus: data.payroll.performanceBonus || 0,
            leaveTravelAllowance: data.payroll.leaveTravelAllowance || 0,
            fixedAllowance: data.payroll.fixedAllowance || 0,
            employeePF: data.payroll.employeePF || 0,
            employerPF: data.payroll.employerPF || 0,
            professionalTax: data.payroll.professionalTax || 200,
            allowances: data.payroll.allowances || 0,
            deductions: data.payroll.deductions || 0,
            bonus: data.payroll.bonus || 0,
            payCycle: data.payroll.payCycle || "monthly",
            currency: data.payroll.currency || "INR",
            taxId: data.payroll.taxId || "",
            pfNumber: data.payroll.pfNumber || "",
            esiNumber: data.payroll.esiNumber || "",
          });
        }
      }
    } catch (err) {
      setPayrollMsg((err as Error).message || "Failed to update payroll");
    } finally {
      setPayrollLoading(false);
    }
  }

  const pendingLeaves = leaves.filter((l) => l.status === "Pending");

  const adminTabs = [
    { id: "dashboard", label: "Overview", icon: LayoutDashboard },
    { id: "employees", label: "Employees", icon: Users },
    { id: "leaves", label: "Pending Leaves", icon: Palmtree, badge: pendingLeaves.length },
    { id: "anomalies", label: "Anomaly Alerts", icon: AlertTriangle, badge: anomalies.length, badgeType: "danger" },
    { id: "payroll", label: "Payroll Manager", icon: CircleDollarSign },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-6xl mx-auto text-foreground">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-white" style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}>
              <ShieldAlert size={14} className="sm:size-[16px]" />
            </div>
            <h1 className="text-lg sm:text-2xl font-bold text-foreground tracking-tight">HR Control Center</h1>
          </div>
          <p className="text-[11px] sm:text-sm mt-0.5 sm:mt-1" style={{ color: "var(--muted)" }}>
            Review pending leaves, update payroll parameters, track anomalies and verify employee records
          </p>
        </div>
        <span
          className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full font-precise border self-start sm:self-center"
          style={{ background: "rgba(239,68,68,0.08)", color: "var(--danger)", borderColor: "rgba(239,68,68,0.2)" }}
        >
          Administrator Account
        </span>
      </div>



      <div>
        {activeTab === "dashboard" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            <div className="rounded-2xl p-4 sm:p-6 glass-panel hover:-translate-y-1 hover:shadow-lg transition-all duration-300 flex flex-col justify-between h-40 sm:h-48">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[var(--muted)] font-precise">Employees</p>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-1 sm:mt-2 font-precise">{employees.length}</h3>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                  <Users size={16} className="sm:size-[20px]" />
                </div>
              </div>
              <button 
                onClick={() => router.push("/admin?tab=employees")}
                className="w-full py-2 sm:py-2.5 rounded-xl border border-indigo-500/20 text-[10px] sm:text-xs font-bold text-indigo-500 bg-indigo-500/5 hover:bg-indigo-500/10 transition-all cursor-pointer flex items-center justify-center gap-1.5 font-precise uppercase tracking-wider"
              >
                Manage Directory <ArrowRight size={12} className="sm:size-[14px]" />
              </button>
            </div>

            <div className="rounded-2xl p-4 sm:p-6 glass-panel hover:-translate-y-1 hover:shadow-lg transition-all duration-300 flex flex-col justify-between h-40 sm:h-48">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[var(--muted)] font-precise">Pending Leaves</p>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-1 sm:mt-2 font-precise">{pendingLeaves.length}</h3>
                </div>
                <div 
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center"
                  style={{
                    background: pendingLeaves.length > 0 ? "var(--warning-bg)" : "var(--success-bg)",
                    color: pendingLeaves.length > 0 ? "var(--warning)" : "var(--success)",
                  }}
                >
                  <Palmtree size={16} className="sm:size-[20px]" />
                </div>
              </div>
              <button 
                onClick={() => router.push("/admin?tab=leaves")}
                className="w-full py-2 sm:py-2.5 rounded-xl border text-[10px] sm:text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 font-precise uppercase tracking-wider hover:opacity-90"
                style={{
                  borderColor: pendingLeaves.length > 0 ? "var(--warning-border)" : "var(--success-border)",
                  color: pendingLeaves.length > 0 ? "var(--warning)" : "var(--success)",
                  background: pendingLeaves.length > 0 ? "var(--warning-bg)" : "var(--success-bg)",
                }}
              >
                Review Requests <ArrowRight size={12} className="sm:size-[14px]" />
              </button>
            </div>

            <div className="rounded-2xl p-4 sm:p-6 glass-panel hover:-translate-y-1 hover:shadow-lg transition-all duration-300 flex flex-col justify-between h-40 sm:h-48">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[var(--muted)] font-precise">Anomaly Alerts</p>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-1 sm:mt-2 font-precise">{anomalies.length}</h3>
                </div>
                <div 
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${anomalies.length > 0 ? "animate-pulse" : ""}`}
                  style={{
                    background: anomalies.length > 0 ? "var(--danger-bg)" : "var(--success-bg)",
                    color: anomalies.length > 0 ? "var(--danger)" : "var(--success)",
                  }}
                >
                  <AlertTriangle size={16} className="sm:size-[20px]" />
                </div>
              </div>
              <button 
                onClick={() => router.push("/admin?tab=anomalies")}
                className="w-full py-2 sm:py-2.5 rounded-xl border text-[10px] sm:text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 font-precise uppercase tracking-wider hover:opacity-90"
                style={{
                  borderColor: anomalies.length > 0 ? "var(--danger-border)" : "var(--success-border)",
                  color: anomalies.length > 0 ? "var(--danger)" : "var(--success)",
                  background: anomalies.length > 0 ? "var(--danger-bg)" : "var(--success-bg)",
                }}
              >
                Investigate Alerts <ArrowRight size={12} className="sm:size-[14px]" />
              </button>
            </div>

            <div className="rounded-2xl p-4 sm:p-6 glass-panel hover:-translate-y-1 hover:shadow-lg transition-all duration-300 flex flex-col justify-between h-40 sm:h-48">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[var(--muted)] font-precise">Payroll Status</p>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-1 sm:mt-2 font-precise">Active</h3>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                  <CircleDollarSign size={16} className="sm:size-[20px]" />
                </div>
              </div>
              <button 
                onClick={() => router.push("/admin?tab=payroll")}
                className="w-full py-2 sm:py-2.5 rounded-xl border border-indigo-500/20 text-[10px] sm:text-xs font-bold text-indigo-500 bg-indigo-500/5 hover:bg-indigo-500/10 transition-all cursor-pointer flex items-center justify-center gap-1.5 font-precise uppercase tracking-wider"
              >
                Configure Payroll <ArrowRight size={12} className="sm:size-[14px]" />
              </button>
            </div>
          </div>
        )}

        {activeTab === "employees" && (
          <div className="rounded-2xl border overflow-hidden glass-panel">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: "var(--card-border)", background: "rgba(255,255,255,0.02)" }}>
                    <th className="p-2 sm:p-4 font-bold text-foreground uppercase tracking-wider text-[10px] sm:text-xs font-precise">Employee</th>
                    <th className="p-2 sm:p-4 font-bold text-foreground uppercase tracking-wider text-[10px] sm:text-xs font-precise hidden sm:table-cell">ID / Role</th>
                    <th className="p-2 sm:p-4 font-bold text-foreground uppercase tracking-wider text-[10px] sm:text-xs font-precise hidden md:table-cell">Department</th>
                    <th className="p-2 sm:p-4 font-bold text-foreground uppercase tracking-wider text-[10px] sm:text-xs font-precise hidden lg:table-cell">Type</th>
                    <th className="p-2 sm:p-4 font-bold text-foreground uppercase tracking-wider text-[10px] sm:text-xs font-precise">Status</th>
                    <th className="p-2 sm:p-4 font-bold text-foreground uppercase tracking-wider text-[10px] sm:text-xs font-precise text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {employees.map((emp) => (
                    <tr key={emp._id} className="hover:bg-slate-100/5 dark:hover:bg-white/[0.01] transition-colors">
                      <td className="p-2 sm:p-4">
                        <div className="font-bold text-foreground text-xs sm:text-sm">{emp.name}</div>
                        <div className="text-[10px] sm:text-xs font-mono" style={{ color: "var(--muted)" }}>
                          {emp.email}
                        </div>
                      </td>
                      <td className="p-2 sm:p-4 hidden sm:table-cell">
                        <div className="text-foreground font-semibold font-mono text-xs sm:text-sm">{emp.employeeId}</div>
                        <div className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider font-precise text-indigo-500 dark:text-indigo-400 mt-0.5">
                          {emp.role}
                        </div>
                      </td>
                      <td className="p-2 sm:p-4 text-foreground font-medium text-xs sm:text-sm hidden md:table-cell">{emp.department || "—"}</td>
                      <td className="p-2 sm:p-4 hidden lg:table-cell">
                        <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2.5 py-0.5 rounded-full font-bold border uppercase tracking-wider font-precise whitespace-nowrap" style={{ background: "rgba(99,102,241,0.1)", color: "var(--primary)", borderColor: "rgba(99,102,241,0.2)" }}>
                          {emp.employmentType || "—"}
                        </span>
                      </td>
                      <td className="p-2 sm:p-4">
                        <span
                          className="text-[9px] sm:text-[10px] px-1.5 sm:px-2.5 py-0.5 rounded-full font-bold border uppercase tracking-wider font-precise whitespace-nowrap"
                          style={{
                            background: emp.isVerified ? "var(--success-bg)" : "var(--warning-bg)",
                            color: emp.isVerified ? "var(--success)" : "var(--warning)",
                            borderColor: emp.isVerified ? "var(--success-border)" : "var(--warning-border)",
                          }}
                        >
                          {emp.isVerified ? "Verified" : "Pending"}
                        </span>
                      </td>
                      <td className="p-2 sm:p-4 text-right">
                        {!emp.isVerified && (
                          <button
                            onClick={() => handleVerify(emp._id)}
                            className="px-2 sm:px-3.5 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all cursor-pointer shadow-md shadow-indigo-600/10 font-precise uppercase tracking-wider whitespace-nowrap"
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
          </div>
        )}

        {activeTab === "leaves" && (
          <div className="space-y-3 sm:space-y-4">
            {pendingLeaves.length === 0 ? (
              <div className="text-center py-10 sm:py-16 border rounded-2xl glass-panel flex flex-col items-center justify-center">
                <Inbox className="w-8 h-8 sm:w-12 sm:h-12 text-slate-500 mb-3" />
                <p style={{ color: "var(--muted)" }} className="text-xs sm:text-sm font-medium">
                  No pending leave requests registered.
                </p>
              </div>
            ) : (
              pendingLeaves.map((l) => (
                <div
                  key={l._id}
                  className="rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row justify-between gap-4 sm:gap-6 glass-panel"
                >
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                      <h3 className="font-bold text-foreground text-sm sm:text-base">{l.userId?.name || "Unknown"}</h3>
                      <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full font-bold font-mono" style={{ background: "rgba(99, 102, 241, 0.15)", color: "var(--primary)" }}>
                        {l.userId?.employeeId || "—"}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-foreground/80">
                      Requested <strong className="text-indigo-600 dark:text-indigo-300 font-precise">{l.leaveType} Leave</strong>
                      <span className="font-mono text-[10px] sm:text-xs mx-1 block sm:inline" style={{ color: "var(--muted)" }}>
                        ({new Date(l.startDate).toLocaleDateString("en-IN")} to {new Date(l.endDate).toLocaleDateString("en-IN")})
                      </span>
                    </p>
                    {l.remarks && (
                      <p className="text-[10px] sm:text-xs bg-slate-100 dark:bg-slate-950/40 p-2 sm:p-3 rounded-lg border border-slate-200 dark:border-white/5 font-mono text-foreground/80">
                        Reason: &quot;{l.remarks}&quot;
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 sm:gap-3 w-full sm:w-auto sm:min-w-[280px] self-stretch sm:self-center">
                    <input
                      type="text"
                      placeholder="Comment (optional)"
                      value={hrComment}
                      onChange={(e) => setHrComment(e.target.value)}
                      className="px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl text-xs text-foreground outline-none w-full border"
                      style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleLeaveDecision(l._id, "Approved")}
                        disabled={decisionLoading !== null}
                        className="flex-1 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all disabled:opacity-50 cursor-pointer uppercase tracking-wider font-precise shadow-md shadow-emerald-950/20"
                      >
                        {decisionLoading === l._id ? "..." : "Approve"}
                      </button>
                      <button
                        onClick={() => handleLeaveDecision(l._id, "Rejected")}
                        disabled={decisionLoading !== null}
                        className="flex-1 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-all disabled:opacity-50 cursor-pointer uppercase tracking-wider font-precise shadow-md shadow-red-950/20"
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
          <div className="space-y-3 sm:space-y-4">
            <div 
              className="p-3 sm:p-4 rounded-xl text-[10px] sm:text-xs border flex items-start gap-2"
              style={{
                background: "var(--warning-bg)",
                borderColor: "var(--warning-border)",
                color: "var(--warning)",
              }}
            >
              <AlertCircle size={14} className="sm:size-[16px] flex-shrink-0 mt-0.5" style={{ color: "var(--warning)" }} />
              <div>
                <strong className="font-bold">Intelligence Alerts:</strong> Generated based on stale leave approval delays (48h+ pending) and abnormal absence thresholds (3+ absences/month).
              </div>
            </div>
            {anomalies.length === 0 ? (
              <div className="text-center py-10 sm:py-16 border rounded-2xl glass-panel flex flex-col items-center justify-center">
                <CheckCircle2 className="w-8 h-8 sm:w-12 sm:h-12 text-emerald-500 mb-3" />
                <p style={{ color: "var(--muted)" }} className="text-xs sm:text-sm font-medium">
                  Zero operational anomalies flagged. System status clean.
                </p>
              </div>
            ) : (
              anomalies.map((anom, i) => (
                <div
                  key={i}
                  className="rounded-2xl p-4 sm:p-5 flex items-start gap-3 sm:gap-4 glass-panel border-l-4"
                  style={{
                    borderLeftColor: anom.type === "stale_leave" ? "var(--warning)" : "var(--danger)",
                  }}
                >
                  <div
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      background: anom.type === "stale_leave" ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)",
                      color: anom.type === "stale_leave" ? "var(--warning)" : "var(--danger)",
                    }}
                  >
                    {anom.type === "stale_leave" ? <Clock size={14} className="sm:size-[16px]" /> : <AlertTriangle size={14} className="sm:size-[16px]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground text-xs sm:text-sm font-precise">
                      {anom.type === "stale_leave" ? "Stale Leave Request" : "Abnormal Absence"}: {anom.employeeName}
                    </h3>
                    <p className="text-[10px] sm:text-xs mt-1" style={{ color: "var(--muted)" }}>
                      {anom.detail}
                    </p>
                    {anom.type === "stale_leave" && (
                      <button
                        onClick={() => router.push("/admin?tab=leaves")}
                        className="text-[10px] sm:text-xs text-indigo-500 dark:text-indigo-400 font-bold hover:underline mt-2 flex items-center gap-1 cursor-pointer font-precise"
                      >
                        Navigate to approval board <ArrowRight size={10} className="sm:size-[12px]" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "payroll" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="lg:col-span-1 border rounded-2xl overflow-hidden glass-panel">
              <div
                className="p-3 sm:p-4 border-b font-bold text-xs sm:text-sm tracking-wide font-precise uppercase flex items-center gap-2"
                style={{ borderColor: "var(--card-border)", background: "rgba(255,255,255,0.02)" }}
              >
                <Users size={14} className="sm:size-[16px] text-indigo-400" />
                Select Employee
              </div>
              <div className="divide-y divide-slate-100 dark:divide-white/5 max-h-[360px] sm:max-h-[480px] overflow-y-auto">
                {employees.map((emp) => (
                  <button
                    key={emp._id}
                    onClick={() => handleSelectEmployeeForPayroll(emp)}
                    className="w-full p-3 sm:p-4 text-left transition-all hover:bg-slate-100/5 dark:hover:bg-white/[0.01] flex flex-col gap-0.5 sm:gap-1 cursor-pointer border-l-2 border-transparent"
                    style={{ 
                      background: selectedEmp?._id === emp._id ? "rgba(99,102,241,0.08)" : "transparent",
                      borderLeftColor: selectedEmp?._id === emp._id ? "var(--primary)" : "transparent"
                    }}
                  >
                    <span className="font-bold text-xs sm:text-sm text-foreground">{emp.name}</span>
                    <span className="text-[10px] sm:text-xs" style={{ color: "var(--muted)" }}>
                      {emp.department} · {emp.employeeId}
                    </span>
                    <div className="flex gap-1.5 mt-0.5 flex-wrap">
                      {emp.employmentType && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider font-precise" style={{ background: "rgba(99,102,241,0.1)", color: "var(--primary)" }}>
                          {emp.employmentType}
                        </span>
                      )}
                      {emp.status && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider font-precise" style={{ background: emp.status === "active" ? "var(--success-bg)" : "var(--warning-bg)", color: emp.status === "active" ? "var(--success)" : "var(--warning)" }}>
                          {emp.status}
                        </span>
                      )}
                      {emp.workLocation && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider font-precise" style={{ background: "rgba(245,158,11,0.1)", color: "var(--warning)" }}>
                          {emp.workLocation}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2">
              {selectedEmp ? (
                <div className="rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-6 glass-panel">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                        <User size={12} className="sm:size-[14px]" />
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-foreground font-precise">Payroll configuration</h3>
                    </div>
                    <p style={{ color: "var(--muted)" }} className="text-[10px] sm:text-xs">
                      Setting parameters for <strong className="text-foreground">{selectedEmp.name}</strong> ({selectedEmp.employeeId})
                    </p>
                  </div>

                  {payrollMsg && (
                    <div
                      className="p-3 sm:p-4 rounded-xl text-xs sm:text-sm font-semibold border flex items-center gap-2"
                      style={{
                        background: payrollMsg.startsWith("✓") ? "var(--success-bg)" : "var(--danger-bg)",
                        color: payrollMsg.startsWith("✓") ? "var(--success)" : "var(--danger)",
                        borderColor: payrollMsg.startsWith("✓") ? "var(--success-border)" : "var(--danger-border)"
                      }}
                    >
                      {payrollMsg.startsWith("✓") ? <CheckCircle2 size={14} className="sm:size-[16px]" /> : <AlertCircle size={14} className="sm:size-[16px]" />}
                      {payrollMsg}
                    </div>
                  )}

                  <form onSubmit={handleUpdatePayroll} className="space-y-4 sm:space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-[10px] sm:text-xs font-semibold mb-1.5 sm:mb-2 uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                          Monthly Wage (₹)
                        </label>
                        <input
                          type="number"
                          required
                          value={payrollForm.monthlyWage || ""}
                          onChange={(e) => handleWageChange(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm text-foreground outline-none border font-mono font-bold"
                          style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] sm:text-xs font-semibold mb-1.5 sm:mb-2 uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                          Days / Week
                        </label>
                        <select
                          value={payrollForm.workingDaysPerWeek}
                          onChange={(e) => setPayrollForm((f) => ({ ...f, workingDaysPerWeek: Number(e.target.value) }))}
                          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm text-foreground outline-none border font-bold"
                          style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
                        >
                          {[4, 5, 6, 7].map(d => (
                            <option key={d} value={d}>{d} Days</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] sm:text-xs font-semibold mb-1.5 sm:mb-2 uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                          Break (Hours)
                        </label>
                        <select
                          value={payrollForm.breakTime}
                          onChange={(e) => setPayrollForm((f) => ({ ...f, breakTime: Number(e.target.value) }))}
                          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm text-foreground outline-none border font-bold"
                          style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
                        >
                          {[0.5, 1, 1.5, 2].map(h => (
                            <option key={h} value={h}>{h} Hour{h > 1 ? "s" : ""}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="border-t pt-4 sm:pt-5 space-y-4 sm:space-y-5" style={{ borderColor: "var(--card-border)" }}>
                      <h4 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                        <DollarSign size={12} className="sm:size-[14px]" /> Component Breakdown
                      </h4>
                      
                      <div className="rounded-xl border overflow-hidden text-[10px] sm:text-xs" style={{ borderColor: "var(--card-border)" }}>
                        <div className="grid grid-cols-3 bg-slate-500/5 p-2 sm:p-3 font-semibold border-b uppercase text-[9px] sm:text-[10px] tracking-wider" style={{ borderColor: "var(--card-border)", color: "var(--muted)" }}>
                          <span>Component</span>
                          <span className="hidden sm:inline">Percentage / Basis</span>
                          <span className="sm:hidden">Basis</span>
                          <span className="text-right">Amount</span>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-white/5">
                          {[
                            { name: "Basic Salary", pct: "50% of Wage", val: payrollForm.basic },
                            { name: "HRA", pct: "50% of Basic", val: payrollForm.hra },
                            { name: "Std. Allowance", pct: "8.33% of Wage", val: payrollForm.standardAllowance },
                            { name: "Perf. Bonus", pct: "8.33% of Wage", val: payrollForm.performanceBonus },
                            { name: "LTA", pct: "8.33% of Wage", val: payrollForm.leaveTravelAllowance },
                            { name: "Fixed Allowance", pct: "Remainder", val: payrollForm.fixedAllowance },
                          ].map((comp, idx) => (
                            <div key={idx} className="grid grid-cols-3 p-2 sm:p-3 text-foreground font-medium">
                              <span className="truncate">{comp.name}</span>
                              <span className="hidden sm:inline" style={{ color: "var(--muted)" }}>{comp.pct}</span>
                              <span className="sm:hidden text-center" style={{ color: "var(--muted)" }}>{comp.pct.split(" ")[0]}</span>
                              <span className="text-right font-bold font-mono text-foreground">₹{comp.val?.toLocaleString("en-IN")}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-1 sm:pt-2">
                        <div>
                          <h5 className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-indigo-400 mb-2 sm:mb-2.5">Provident Fund (PF)</h5>
                          <div className="space-y-1.5 sm:space-y-2 text-[10px] sm:text-xs">
                            <div className="flex justify-between p-2 sm:p-2.5 rounded-xl bg-slate-500/5 border border-slate-500/10">
                              <span style={{ color: "var(--muted)" }}>Employee PF</span>
                              <span className="font-bold font-mono text-foreground">₹{payrollForm.employeePF?.toLocaleString("en-IN")}</span>
                            </div>
                            <div className="flex justify-between p-2 sm:p-2.5 rounded-xl bg-slate-500/5 border border-slate-500/10">
                              <span style={{ color: "var(--muted)" }}>Employer PF</span>
                              <span className="font-bold font-mono text-foreground">₹{payrollForm.employerPF?.toLocaleString("en-IN")}</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h5 className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-indigo-400 mb-2 sm:mb-2.5">Deductions</h5>
                          <div className="space-y-1.5 sm:space-y-2 text-[10px] sm:text-xs">
                            <div className="flex justify-between p-2 sm:p-2.5 rounded-xl bg-slate-500/5 border border-slate-500/10">
                              <span style={{ color: "var(--muted)" }}>Professional Tax</span>
                              <span className="font-bold font-mono text-foreground">₹{payrollForm.professionalTax?.toLocaleString("en-IN")}</span>
                            </div>
                            <div className="flex justify-between p-2 sm:p-2.5 rounded-xl bg-slate-500/5 border border-slate-500/10">
                              <span style={{ color: "var(--muted)" }}>Total Deductions</span>
                              <span className="font-bold font-mono text-foreground">₹{payrollForm.deductions?.toLocaleString("en-IN")}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-4 sm:pt-5 space-y-4 sm:space-y-5" style={{ borderColor: "var(--card-border)" }}>
                      <h4 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                        <DollarSign size={12} className="sm:size-[14px]" /> Payroll Metadata
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                        <div>
                          <label className="block text-[10px] sm:text-xs font-semibold mb-1.5 sm:mb-2 uppercase tracking-wider" style={{ color: "var(--muted)" }}>Bonus (₹)</label>
                          <input type="number" value={payrollForm.bonus || ""} onChange={(e) => setPayrollForm((f) => ({ ...f, bonus: parseFloat(e.target.value) || 0 }))} className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm text-foreground outline-none border font-mono font-bold" style={{ background: "var(--background)", borderColor: "var(--card-border)" }} />
                        </div>
                        <div>
                          <label className="block text-[10px] sm:text-xs font-semibold mb-1.5 sm:mb-2 uppercase tracking-wider" style={{ color: "var(--muted)" }}>Pay Cycle</label>
                          <select value={payrollForm.payCycle} onChange={(e) => setPayrollForm((f) => ({ ...f, payCycle: e.target.value }))} className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm text-foreground outline-none border font-bold" style={{ background: "var(--background)", borderColor: "var(--card-border)" }}>
                            {["monthly", "bi-weekly", "weekly"].map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] sm:text-xs font-semibold mb-1.5 sm:mb-2 uppercase tracking-wider" style={{ color: "var(--muted)" }}>Currency</label>
                          <input type="text" value={payrollForm.currency} onChange={(e) => setPayrollForm((f) => ({ ...f, currency: e.target.value }))} className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm text-foreground outline-none border font-bold uppercase" style={{ background: "var(--background)", borderColor: "var(--card-border)" }} />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                        <div>
                          <label className="block text-[10px] sm:text-xs font-semibold mb-1.5 sm:mb-2 uppercase tracking-wider" style={{ color: "var(--muted)" }}>Tax ID</label>
                          <input type="text" value={payrollForm.taxId} onChange={(e) => setPayrollForm((f) => ({ ...f, taxId: e.target.value }))} className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm text-foreground outline-none border font-mono" style={{ background: "var(--background)", borderColor: "var(--card-border)" }} />
                        </div>
                        <div>
                          <label className="block text-[10px] sm:text-xs font-semibold mb-1.5 sm:mb-2 uppercase tracking-wider" style={{ color: "var(--muted)" }}>PF Number</label>
                          <input type="text" value={payrollForm.pfNumber} onChange={(e) => setPayrollForm((f) => ({ ...f, pfNumber: e.target.value }))} className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm text-foreground outline-none border font-mono" style={{ background: "var(--background)", borderColor: "var(--card-border)" }} />
                        </div>
                        <div>
                          <label className="block text-[10px] sm:text-xs font-semibold mb-1.5 sm:mb-2 uppercase tracking-wider" style={{ color: "var(--muted)" }}>ESI Number</label>
                          <input type="text" value={payrollForm.esiNumber} onChange={(e) => setPayrollForm((f) => ({ ...f, esiNumber: e.target.value }))} className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm text-foreground outline-none border font-mono" style={{ background: "var(--background)", borderColor: "var(--card-border)" }} />
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-4 sm:pt-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0" style={{ borderColor: "var(--card-border)" }}>
                      <span className="font-bold text-foreground text-[10px] sm:text-xs font-precise uppercase tracking-wider">Estimated Net Salary</span>
                      <span className="font-bold text-base sm:text-lg text-emerald-500 dark:text-emerald-400 font-mono">
                        ₹{(payrollForm.basic + payrollForm.allowances - payrollForm.deductions).toLocaleString("en-IN")}
                      </span>
                    </div>

                    <button
                      type="submit"
                      disabled={payrollLoading}
                      className="w-full sm:w-auto px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold text-white text-xs sm:text-sm disabled:opacity-60 cursor-pointer transition-all hover:scale-[1.01]"
                      style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
                    >
                      {payrollLoading ? "Updating..." : "Save Payroll Settings"}
                    </button>
                  </form>
                </div>
              ) : (
                <div
                  className="border rounded-2xl p-8 sm:p-16 text-center glass-panel flex flex-col items-center justify-center"
                  style={{ color: "var(--muted)" }}
                >
                  <CircleDollarSign className="w-8 h-8 sm:w-12 sm:h-12 text-slate-500 mb-3" />
                  <p className="text-xs sm:text-sm font-semibold">Select an employee from the list to update parameters.</p>
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
      <div className="p-4 sm:p-6 flex items-center justify-center min-h-64 sm:min-h-96">
        <div className="text-foreground animate-pulse font-medium text-sm">Loading control panel...</div>
      </div>
    }>
      <AdminDashboard />
    </Suspense>
  );
}
