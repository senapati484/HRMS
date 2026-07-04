"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import LogoutButton from "./LogoutButton";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "⊞" },
  { href: "/attendance", label: "Attendance", icon: "📅" },
  { href: "/leave", label: "Leave & Time-off", icon: "🏖️" },
  { href: "/payroll", label: "Payroll", icon: "💰" },
  { href: "/profile", label: "My Profile", icon: "👤" },
  { href: "/admin", label: "Admin Panel", icon: "⚙️", adminOnly: true },
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

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.adminOnly || user.role === "admin"
  );

  return (
    <aside
      className="h-screen sticky top-0 flex flex-col border-r transition-all duration-300"
      style={{
        width: collapsed ? "72px" : "240px",
        background: "var(--card)",
        borderColor: "var(--card-border)",
        minWidth: collapsed ? "72px" : "240px",
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
            <span className="font-bold text-white text-sm">HRMS</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg transition-colors hover:bg-white/5 text-xs"
          style={{ color: "var(--muted)", marginLeft: collapsed ? "auto" : "0", marginRight: collapsed ? "auto" : "0" }}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? "→" : "←"}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium group"
              style={{
                background: isActive ? "rgba(99,102,241,0.15)" : "transparent",
                color: isActive ? "var(--primary)" : "var(--muted)",
              }}
            >
              <span className="text-base flex-shrink-0">{item.icon}</span>
              {!collapsed && (
                <span className="group-hover:text-white transition-colors">
                  {item.label}
                </span>
              )}
              {isActive && !collapsed && (
                <span
                  className="ml-auto w-1.5 h-1.5 rounded-full"
                  style={{ background: "var(--primary)" }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User info + logout */}
      <div
        className="border-t p-3"
        style={{ borderColor: "var(--card-border)" }}
      >
        <div className="flex items-center gap-3 mb-2">
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
              <p className="text-xs font-semibold text-white truncate">{user.name}</p>
              <p className="text-xs truncate" style={{ color: "var(--muted)" }}>
                {user.designation || user.role}
              </p>
            </div>
          )}
        </div>
        <LogoutButton compact={collapsed} />
      </div>
    </aside>
  );
}
