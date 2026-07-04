import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Attendance } from "@/models/Attendance";
import { Leave } from "@/models/Leave";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import CopilotAsk from "@/components/CopilotAsk";

export default async function EmployeeDashboard() {
  const cookieStore = await cookies();
  const token = cookieStore.get("hrms_token")?.value;
  const decoded = token ? verifyToken(token) : null;
  if (!decoded) redirect("/login");

  await connectDB();

  const user = await User.findById(decoded.userId, "-passwordHash").lean();
  if (!user) redirect("/login");

  // Recent activity: last 5 attendance + leave combined
  const [recentAttendance, recentLeaves] = await Promise.all([
    Attendance.find({ userId: decoded.userId }).sort({ createdAt: -1 }).limit(5).lean(),
    Leave.find({ userId: decoded.userId }).sort({ createdAt: -1 }).limit(5).lean(),
  ]);

  const activity = [
    ...recentAttendance.map(a => ({
      type: "attendance" as const,
      label: `Attendance: ${a.status}`,
      date: a.date,
      color: a.status === "Present" ? "var(--success)" : a.status === "HalfDay" ? "var(--warning)" : "var(--danger)",
    })),
    ...recentLeaves.map(l => ({
      type: "leave" as const,
      label: `${l.leaveType} Leave: ${l.status}`,
      date: new Date(l.startDate).toISOString().split("T")[0],
      color: l.status === "Approved" ? "var(--success)" : l.status === "Rejected" ? "var(--danger)" : "var(--warning)",
    })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);

  const quickLinks = [
    { href: "/profile", label: "My Profile", icon: "👤", desc: "View & edit your info" },
    { href: "/attendance", label: "Attendance", icon: "📅", desc: "Check in / Check out" },
    { href: "/leave", label: "Leave", icon: "🏖️", desc: "Apply for time off" },
    { href: "/payroll", label: "Payroll", icon: "💰", desc: "View your salary" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* Top bar */}
      <header className="border-b px-6 py-4 flex items-center justify-between"
        style={{ borderColor: "var(--card-border)", background: "var(--card)" }}>
        <div>
          <h1 className="text-lg font-bold text-white">Good morning, {user.name.split(" ")[0]} 👋</h1>
          <p className="text-xs" style={{ color: "var(--muted)" }}>{user.designation} · {user.department}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs px-3 py-1 rounded-full font-medium"
            style={{ background: "rgba(99,102,241,0.15)", color: "var(--primary)" }}>
            Employee
          </span>
          <LogoutButton />
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Quick access */}
        <div>
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--muted)" }}>QUICK ACCESS</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickLinks.map(({ href, label, icon, desc }) => (
              <Link key={href} href={href}
                className="rounded-2xl p-5 border transition-all hover:scale-105 hover:border-indigo-500/50 block"
                style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
                <div className="text-2xl mb-2">{icon}</div>
                <div className="font-semibold text-white text-sm">{label}</div>
                <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>{desc}</div>
              </Link>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent activity */}
          <div className="rounded-2xl border p-6" style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
            <h2 className="font-semibold text-white mb-4">Recent Activity</h2>
            {activity.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--muted)" }}>No activity yet. Check in to get started!</p>
            ) : (
              <div className="space-y-3">
                {activity.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                    <span className="text-white flex-1">{item.label}</span>
                    <span style={{ color: "var(--muted)" }}>{item.date}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Copilot Q&A */}
          <CopilotAsk />
        </div>
      </div>
    </div>
  );
}
