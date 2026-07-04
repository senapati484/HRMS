"use client";

import { useState, useEffect } from "react";
import { CircleDollarSign, CheckCircle2, AlertTriangle, ShieldCheck, Download } from "lucide-react";

interface PayrollInfo {
  basic: number;
  allowances: number;
  deductions: number;
  net: number;
}

export default function EmployeePayrollPage() {
  const [payroll, setPayroll] = useState<PayrollInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/users/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) return fetch(`/api/payroll/${data.user._id}`);
        throw new Error("Could not fetch user details");
      })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else if (data.payroll) setPayroll(data.payroll);
      })
      .catch((err) => setError(err.message || "Failed to load payroll details"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div className="flex justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">My Payroll</h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Monthly salary breakdown and payslip information
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-foreground py-16 animate-pulse font-medium">
          Loading payroll information...
        </div>
      ) : error ? (
        <div
          className="p-4 rounded-xl text-center text-sm font-semibold border flex items-center justify-center gap-2"
          style={{
            background: "rgba(239, 68, 68, 0.08)",
            color: "var(--danger)",
            borderColor: "rgba(239, 68, 68, 0.2)",
          }}
        >
          <AlertTriangle size={16} />
          {error}
        </div>
      ) : payroll ? (
        <div className="space-y-6">
          {/* Payslip Card */}
          <div className="rounded-2xl p-8 space-y-6 glass-panel relative overflow-hidden">
            {/* Background design glow */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl" />

            <div
              className="border-b pb-5 flex justify-between items-start"
              style={{ borderColor: "var(--card-border)" }}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                    <ShieldCheck size={14} />
                  </div>
                  <h2 className="text-lg font-bold text-foreground font-precise">Monthly Payslip</h2>
                </div>
                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  Acme Corp · Verified &amp; Encrypted
                </p>
              </div>
              <span
                className="text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider font-precise border"
                style={{
                  background: "rgba(16, 185, 129, 0.12)",
                  color: "var(--success)",
                  borderColor: "rgba(16, 185, 129, 0.25)",
                }}
              >
                Paid
              </span>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span style={{ color: "var(--muted)" }}>Basic Salary</span>
                <span className="font-semibold text-foreground font-mono">
                  ₹{(payroll.basic ?? 0).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span style={{ color: "var(--muted)" }}>Allowances (HRA, LTA, etc.)</span>
                <span className="font-semibold font-mono" style={{ color: "var(--success)" }}>
                  +₹{(payroll.allowances ?? 0).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span style={{ color: "var(--muted)" }}>Deductions (PF, Taxes, etc.)</span>
                <span className="font-semibold font-mono" style={{ color: "var(--danger)" }}>
                  -₹{(payroll.deductions ?? 0).toLocaleString("en-IN")}
                </span>
              </div>

              <div
                className="border-t pt-5 flex justify-between items-center"
                style={{ borderColor: "var(--card-border)" }}
              >
                <span className="font-bold text-foreground text-sm font-precise uppercase tracking-wider">
                  Net Take-Home Pay
                </span>
                <span
                  className="text-xl font-extrabold font-mono"
                  style={{
                    background: "linear-gradient(135deg, var(--primary), var(--accent))",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  ₹
                  {(
                    payroll.net ??
                    (payroll.basic ?? 0) + (payroll.allowances ?? 0) - (payroll.deductions ?? 0)
                  ).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>

          <div
            className="p-4 rounded-xl text-xs flex gap-2 border items-start"
            style={{
              background: "rgba(99,102,241,0.04)",
              borderColor: "rgba(99,102,241,0.15)",
              color: "var(--muted)",
            }}
          >
            <CircleDollarSign size={16} className="text-indigo-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Audit Notice:</strong> Payroll details are managed securely by HR admins. For
              discrepancies or requests regarding tax declarations, please consult with your HR representative.
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center text-foreground py-16 glass-panel rounded-2xl">
          No payroll records established for this user yet.
        </div>
      )}
    </div>
  );
}
