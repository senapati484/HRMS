"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";

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
    // We need the user's ID to fetch their payroll
    fetch("/api/users/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          return fetch(`/api/payroll/${data.user._id}`);
        }
        throw new Error("Could not fetch user details");
      })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else if (data.payroll) {
          setPayroll(data.payroll);
        }
      })
      .catch((err) => {
        setError(err.message || "Failed to load payroll details");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <header
        className="border-b px-6 py-4 flex items-center justify-between"
        style={{ borderColor: "var(--card-border)", background: "var(--card)" }}
      >
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm" style={{ color: "var(--muted)" }}>
            ← Dashboard
          </Link>
          <h1 className="text-lg font-bold text-white">My Payroll</h1>
        </div>
        <LogoutButton />
      </header>

      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {loading ? (
          <div className="text-center text-white py-12">Loading payroll information...</div>
        ) : error ? (
          <div
            className="p-4 rounded-xl text-center text-sm"
            style={{
              background: "rgba(239, 68, 68, 0.1)",
              color: "var(--danger)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
            }}
          >
            {error}
          </div>
        ) : payroll ? (
          <div className="space-y-6">
            {/* Pay slip card */}
            <div
              className="rounded-2xl border p-8 space-y-6"
              style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
            >
              <div className="border-b pb-4 flex justify-between items-start" style={{ borderColor: "var(--card-border)" }}>
                <div>
                  <h2 className="text-xl font-bold text-white">Monthly Payslip</h2>
                  <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                    Acme Corp · Confidental
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className="text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{ background: "rgba(16, 185, 129, 0.15)", color: "var(--success)" }}
                  >
                    Paid
                  </span>
                </div>
              </div>

              {/* Salary Breakdown Table */}
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span style={{ color: "var(--muted)" }}>Basic Salary</span>
                  <span className="font-semibold text-white">₹{payroll.basic.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span style={{ color: "var(--muted)" }}>Allowances (HRA, LTA, etc.)</span>
                  <span className="font-semibold" style={{ color: "var(--success)" }}>
                    +₹{payroll.allowances.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span style={{ color: "var(--muted)" }}>Deductions (PF, Taxes, etc.)</span>
                  <span className="font-semibold" style={{ color: "var(--danger)" }}>
                    -₹{payroll.deductions.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="border-t pt-4 flex justify-between items-center" style={{ borderColor: "var(--card-border)" }}>
                  <span className="font-semibold text-white text-base">Net Take-Home Pay</span>
                  <span
                    className="text-xl font-extrabold"
                    style={{
                      background: "linear-gradient(135deg, var(--primary), var(--accent))",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    ₹{payroll.net.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>

            {/* Note info */}
            <div
              className="p-4 rounded-xl text-xs"
              style={{ background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.15)", color: "var(--muted)" }}
            >
              💡 <strong>Note:</strong> Payroll details are managed and updated by the HR administration department. For any queries or corrections, please contact your HR representative.
            </div>
          </div>
        ) : (
          <div className="text-center text-white py-12">No payroll record found.</div>
        )}
      </div>
    </div>
  );
}
