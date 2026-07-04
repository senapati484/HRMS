"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import LogoutButton from "./LogoutButton";
import { 
  LayoutDashboard, 
  Calendar, 
  Palmtree, 
  CircleDollarSign, 
  User as UserIcon, 
  Users, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon
} from "lucide-react";

import { useThemeStore } from "@/lib/store/themeStore";
import { useUserStore } from "@/lib/store/userStore";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<any>;
  tab?: string;
}

const EMPLOYEE_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/attendance", label: "Attendance", icon: Calendar },
  { href: "/leave", label: "Leave & Time-off", icon: Palmtree },
  { href: "/payroll", label: "Payroll", icon: CircleDollarSign },
  { href: "/profile", label: "My Profile", icon: UserIcon },
];

const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin?tab=employees", label: "Employees", icon: Users, tab: "employees" },
  { href: "/admin?tab=leaves", label: "Leave Requests", icon: Palmtree, tab: "leaves" },
  { href: "/admin?tab=payroll", label: "Payroll Manager", icon: CircleDollarSign, tab: "payroll" },
  { href: "/admin?tab=anomalies", label: "Anomaly Alerts", icon: AlertTriangle, tab: "anomalies" },
  { href: "/profile", label: "My Profile", icon: UserIcon },
];

interface SidebarProps {
  user: {
    name: string;
    employeeId: string;
    designation?: string;
    department?: string;
    role: string;
    profilePicture?: string;
  };
}

function SidebarInner({ user }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");
  const [collapsed, setCollapsed] = useState(false);
  
  const { theme, initTheme, toggleTheme } = useThemeStore();
  const setUser = useUserStore((s) => s.setUser);

  const isAdmin = user.role === "admin";
  const navItems = isAdmin ? ADMIN_NAV : EMPLOYEE_NAV;

  // Initialize theme and cache user in store
  useEffect(() => {
    initTheme();
    if (user) {
      setUser(user as any);
    }
  }, [user, setUser, initTheme]);

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  function isActive(item: NavItem): boolean {
    if (item.tab) {
      return pathname === "/admin" && currentTab === item.tab;
    }
    if (item.href === "/admin") {
      return pathname === "/admin" && (!currentTab || currentTab === "dashboard");
    }
    return pathname === item.href;
  }

  return (
    <aside
      className="h-screen sticky top-0 flex flex-col border-r transition-all duration-300"
      style={{
        width: collapsed ? "72px" : "240px",
        minWidth: collapsed ? "72px" : "240px",
        background: "var(--sidebar)",
        borderColor: "var(--sidebar-border)",
      }}
    >
      {/* Logo + collapse */}
      <div
        className="flex items-center justify-between px-4 py-5 border-b"
        style={{ borderColor: "var(--card-border)" }}
      >
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{
                background: "linear-gradient(135deg, var(--primary), var(--accent))",
              }}
            >
              H
            </div>
            <div>
              <span className="font-bold text-foreground text-sm tracking-wider font-precise">HRMS</span>
              {isAdmin && (
                <span
                  className="ml-2 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-widest font-precise"
                  style={{ background: "rgba(239,68,68,0.12)", color: "var(--danger)" }}
                >
                  Admin
                </span>
              )}
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg transition-colors hover:bg-slate-500/10 text-xs cursor-pointer text-[var(--muted)]"
          style={{
            marginLeft: collapsed ? "auto" : "0",
            marginRight: collapsed ? "auto" : "0",
          }}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
        {!collapsed && (
          <p
            className="text-[10px] font-bold px-3 pb-2 tracking-widest uppercase font-precise text-[var(--muted)]"
            style={{ opacity: 0.5 }}
          >
            {isAdmin ? "Administration" : "Navigation"}
          </p>
        )}
        {navItems.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center rounded-xl transition-all text-sm font-semibold group relative cursor-pointer hover:bg-slate-500/5 ${
                collapsed 
                  ? "justify-center w-10 h-10 mx-auto" 
                  : "gap-3 px-3 py-2.5"
              }`}
              style={{
                background: active ? "rgba(99,102,241,0.08)" : "transparent",
                color: active ? "var(--primary)" : "var(--muted)",
              }}
            >
              {active && (
                <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-indigo-500" />
              )}
              <Icon size={18} className="flex-shrink-0 transition-colors group-hover:text-foreground" />
              {!collapsed && (
                <span className="group-hover:text-foreground transition-colors flex-1">
                  {item.label}
                </span>
              )}
              {active && !collapsed && (
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-indigo-500"
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User info, Theme & Logout */}
      <div className="border-t p-3 space-y-3" style={{ borderColor: "var(--card-border)" }}>
        <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs flex-shrink-0 overflow-hidden"
            style={{
              background: "linear-gradient(135deg, var(--primary), var(--accent))",
            }}
          >
            {user.profilePicture ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.profilePicture}
                alt={user.name}
                className="w-full h-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground truncate">{user.name}</p>
              <p className="text-[10px] truncate uppercase font-semibold font-precise text-[var(--muted)]">
                {user.designation || user.role}
              </p>
            </div>
          )}
        </div>

        {/* Action button row (Theme toggle + Logout button) */}
        <div className={`flex gap-2 ${collapsed ? "flex-col" : "flex-row"}`}>
          {/* Theme Toggler */}
          <button
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className={`flex items-center justify-center p-2 rounded-xl transition-all border cursor-pointer hover:bg-slate-500/10 ${
              collapsed ? "w-full" : "w-11"
            }`}
            style={{
              borderColor: "var(--card-border)",
              color: "var(--muted)",
            }}
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          
          <LogoutButton compact={collapsed} />
        </div>
      </div>
    </aside>
  );
}

export default function Sidebar({ user }: SidebarProps) {
  return (
    <Suspense
      fallback={
        <aside
          className="h-screen sticky top-0 flex flex-col border-r"
          style={{ width: "240px", minWidth: "240px", background: "var(--card)", borderColor: "var(--card-border)" }}
        />
      }
    >
      <SidebarInner user={user} />
    </Suspense>
  );
}
