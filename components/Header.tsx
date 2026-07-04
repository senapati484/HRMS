"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useUserStore } from "@/lib/store/userStore";
import { LogOut, User, Shield, Moon, Sun, Clock, Users, Calendar, Compass, CircleDollarSign } from "lucide-react";

interface UserInfo {
  _id: string;
  name: string;
  email: string;
  role: string;
  employeeId: string;
  profilePicture?: string;
  companyName?: string;
  companyLogo?: string;
}

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const fetchUser = useUserStore((s) => s.fetchUser);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [attendance, setAttendance] = useState<any>(null);
  const [loadingAttendance, setLoadingAttendance] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch current user once and cache in store
  useEffect(() => {
    if (!user) fetchUser();

    const savedTheme = localStorage.getItem("theme") as "light" | "dark";
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.className = savedTheme;
    } else {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      setTheme(systemTheme);
      document.documentElement.className = systemTheme;
    }
  }, []);

  // Fetch today's attendance status
  const fetchTodayAttendance = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch(`/api/attendance?from=${today}&to=${today}`);
      const data = await res.json();
      if (data.attendance && data.attendance.length > 0) {
        setAttendance(data.attendance[0]);
      } else {
        setAttendance(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAttendance(false);
    }
  };

  useEffect(() => {
    fetchTodayAttendance();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    document.documentElement.className = nextTheme;
  };

  const handleCheckInOut = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/attendance", { method: "POST" });
      if (res.ok) {
        await fetchTodayAttendance();
        router.refresh(); // refresh server components/data
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  // Determine status dot color
  // Green: Checked In (has checkIn but no checkOut)
  // Yellow: Checked Out (has checkIn and checkOut)
  // Red/Gray: Not Checked In
  const getStatusColor = () => {
    if (loadingAttendance) return "bg-slate-400";
    if (!attendance) return "bg-red-500";
    if (attendance.checkIn && !attendance.checkOut) return "bg-green-500 animate-pulse";
    return "bg-yellow-500";
  };

  const getStatusText = () => {
    if (loadingAttendance) return "Loading...";
    if (!attendance) return "Absent / Not Checked In";
    if (attendance.checkIn && !attendance.checkOut) return "Checked In";
    return "Checked Out";
  };

  const initials = user?.name ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "U";

  const tabs = user?.role === "admin"
    ? [
        { label: "Overview", href: "/admin", icon: Shield },
        { label: "Employees", href: "/admin?tab=employees", icon: Users },
        { label: "Leave Requests", href: "/admin?tab=leaves", icon: Compass },
        { label: "Anomalies", href: "/admin?tab=anomalies", icon: Clock },
        { label: "Payroll", href: "/admin?tab=payroll", icon: CircleDollarSign },
      ]
    : [
        { label: "Dashboard", href: "/dashboard", icon: Users },
        { label: "Attendance", href: "/attendance", icon: Calendar },
        { label: "Time Off", href: "/leave", icon: Compass },
      ];

  return (
    <header className="sticky top-0 z-40 w-full border-b backdrop-blur-md transition-colors"
      style={{ background: "var(--card-header-bg, rgba(255, 255, 255, 0.8))", borderColor: "var(--card-border)" }}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Left: Branding & Navigation */}
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            {user?.companyLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.companyLogo} alt={user?.companyName || "Logo"} className="h-8 w-8 rounded-lg object-cover" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg font-bold text-white text-sm"
                style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}>
                {user?.companyName ? user.companyName.slice(0, 2).toUpperCase() : "HR"}
              </div>
            )}
            <span className="font-precise text-base font-bold text-foreground">
              {user?.companyName || "HRMS"}
            </span>
          </Link>

          {/* Navigation Link Tabs */}
          <nav className="hidden md:flex items-center gap-1.5">
            {tabs.map((tab) => {
              const baseHref = tab.href.split("?")[0];
              const active = pathname === baseHref;
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all relative"
                  style={{
                    color: active ? "var(--primary)" : "var(--muted)",
                    background: active ? "rgba(99, 102, 241, 0.06)" : "transparent"
                  }}
                >
                  <Icon size={16} />
                  {tab.label}
                  {active && (
                    <span className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-indigo-500" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Status Dot, Theme & Profile Dropdown */}
        <div className="flex items-center gap-4">
          {/* Status Indicator Dot */}
          <div className="flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold"
            style={{ background: "var(--background)", borderColor: "var(--card-border)" }}>
            <span className={`h-2.5 w-2.5 rounded-full ${getStatusColor()}`} />
            <span style={{ color: "var(--muted)" }}>{getStatusText()}</span>
          </div>

          {/* Dropdown Container */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-xl overflow-hidden cursor-pointer border transition-all hover:scale-105"
              style={{ borderColor: "var(--card-border)" }}
            >
              {user?.profilePicture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.profilePicture} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-bold text-white text-xs"
                  style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}>
                  {initials}
                </div>
              )}
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl border p-4 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200"
                style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
                {/* Header User Profile Info */}
                <div className="border-b pb-3 mb-3" style={{ borderColor: "var(--card-border)" }}>
                  <div className="font-bold text-sm text-foreground truncate">{user?.name}</div>
                  <div className="text-xs truncate mt-0.5" style={{ color: "var(--muted)" }}>{user?.email}</div>
                  <div className="text-[10px] font-mono mt-1 font-bold uppercase tracking-wider text-indigo-500">{user?.employeeId}</div>
                </div>

                {/* Attendance Check In / Check Out Systray Area */}
                <div className="rounded-xl border p-3 mb-3 text-center" style={{ background: "var(--background)", borderColor: "var(--card-border)" }}>
                  {attendance?.checkIn && !attendance?.checkOut ? (
                    <div className="mb-2">
                      <div className="text-[10px] uppercase font-bold tracking-widest" style={{ color: "var(--muted)" }}>Checked In</div>
                      <div className="text-xs font-semibold text-foreground flex items-center justify-center gap-1 mt-1">
                        <Clock size={12} className="text-green-500" />
                        Since {new Date(attendance.checkIn).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  ) : attendance?.checkOut ? (
                    <div className="mb-2">
                      <div className="text-[10px] uppercase font-bold tracking-widest" style={{ color: "var(--muted)" }}>Done for today</div>
                      <div className="text-xs font-semibold" style={{ color: "var(--success)" }}>Checked Out</div>
                    </div>
                  ) : (
                    <div className="mb-2 text-[10px] uppercase font-bold tracking-widest" style={{ color: "var(--muted)" }}>
                      Not Checked In Yet
                    </div>
                  )}

                  <button
                    onClick={handleCheckInOut}
                    disabled={actionLoading || !!(attendance?.checkIn && attendance?.checkOut)}
                    className="w-full py-2 rounded-lg text-xs font-bold text-white transition-all disabled:opacity-50 hover:opacity-90 cursor-pointer"
                    style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
                  >
                    {actionLoading ? "Processing..." : attendance?.checkIn ? (attendance?.checkOut ? "Checked Out" : "Check Out ->") : "Check In ->"}
                  </button>
                </div>

                {/* Dropdown Options */}
                <div className="space-y-1">
                  {user?.role === "admin" && (
                    <Link
                      href="/admin"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-foreground hover:bg-slate-500/5 transition-all"
                    >
                      <Shield size={14} className="text-indigo-400" />
                      Admin Panel
                    </Link>
                  )}

                  <Link
                    href="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-foreground hover:bg-slate-500/5 transition-all"
                  >
                    <User size={14} className="text-indigo-400" />
                    My Profile
                  </Link>

                  {/* Theme Toggle option */}
                  <button
                    onClick={toggleTheme}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-foreground hover:bg-slate-500/5 text-left transition-all cursor-pointer"
                  >
                    {theme === "light" ? (
                      <>
                        <Moon size={14} className="text-indigo-400" />
                        Dark Mode
                      </>
                    ) : (
                      <>
                        <Sun size={14} className="text-indigo-400" />
                        Light Mode
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-500/5 text-left transition-all cursor-pointer"
                  >
                    <LogOut size={14} />
                    Log Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
