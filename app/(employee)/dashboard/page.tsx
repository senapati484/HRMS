import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Attendance } from "@/models/Attendance";
import { Leave } from "@/models/Leave";
import CopilotAsk from "@/components/CopilotAsk";
import Link from "next/link";

export default async function EmployeeDashboard() {
  const cookieStore = await cookies();
  const token = cookieStore.get("hrms_token")?.value;
  const decoded = token ? verifyToken(token) : null;
  if (!decoded) redirect("/login");

  await connectDB();

  const user = (await User.findById(decoded.userId, "-passwordHash").lean()) as any;
  if (!user) redirect("/login");

  const today = new Date().toISOString().split("T")[0];

  const [recentAttendance, recentLeaves, todayAttendance] = await Promise.all([
    (await Attendance.find({ userId: decoded.userId }).sort({ createdAt: -1 }).limit(5).lean()) as any[],
    (await Leave.find({ userId: decoded.userId }).sort({ createdAt: -1 }).limit(5).lean()) as any[],
    (await Attendance.findOne({ userId: decoded.userId, date: today }).lean()) as any,
  ]);

  const activity = [
    ...recentAttendance.map((a: any) => ({
      type: "attendance" as const,
      label: `Attendance: ${a.status}`,
      date: a.date,
      color:
        a.status === "Present"
          ? "var(--success)"
          : a.status === "HalfDay"
          ? "var(--warning)"
          : "var(--danger)",
    })),
    ...recentLeaves.map((l: any) => ({
      type: "leave" as const,
      label: `${l.leaveType} Leave: ${l.status}`,
      date: new Date(l.startDate).toISOString().split("T")[0],
      color:
        l.status === "Approved"
          ? "var(--success)"
          : l.status === "Rejected"
          ? "var(--danger)"
          : "var(--warning)",
    })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8);

  const quickLinks = [
    { href: "/attendance", label: "Attendance", icon: "📅", desc: "Check in / Check out" },
    { href: "/leave", label: "Leave", icon: "🏖️", desc: "Apply for time off" },
    { href: "/payroll", label: "Payroll", icon: "💰", desc: "View your salary" },
    { href: "/profile", label: "Profile", icon: "👤", desc: "View & edit your info" },
  ];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Welcome banner */}
      <div
        className="rounded-2xl p-6 border flex items-center justify-between"
        style={{
          background: "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))",
          borderColor: "rgba(99,102,241,0.25)",
        }}
      >
        <div>
          <h1 className="text-2xl font-bold text-white">
            {greeting}, {user.name.split(" ")[0]} 👋
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            {user.designation} · {user.department} ·{" "}
            <span className="font-mono">{user.employeeId}</span>
          </p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-white">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          {todayAttendance ? (
            <p className="text-xs mt-1" style={{ color: "var(--success)" }}>
              ✓ {todayAttendance.checkOut ? "Checked out" : "Checked in"} today
            </p>
          ) : (
            <p className="text-xs mt-1" style={{ color: "var(--warning)" }}>
              ⚠ Not checked in yet
            </p>
          )}
        </div>
      </div>

      {/* Quick access */}
      <div>
        <h2 className="text-xs font-semibold mb-3 tracking-widest uppercase" style={{ color: "var(--muted)" }}>
          Quick Access
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickLinks.map(({ href, label, icon, desc }) => (
            <Link
              key={href}
              href={href}
              className="rounded-2xl p-5 border transition-all hover:scale-105 hover:border-indigo-500/50 block group"
              style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
            >
              <div className="text-2xl mb-2">{icon}</div>
              <div className="font-semibold text-white text-sm group-hover:text-indigo-300 transition-colors">
                {label}
              </div>
              <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                {desc}
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent activity */}
        <div
          className="rounded-2xl border p-6"
          style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
        >
          <h2 className="font-semibold text-white mb-4">Recent Activity</h2>
          {activity.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-3xl mb-2">📭</p>
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                No activity yet. Check in to get started!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activity.map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: item.color }}
                  />
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
  );
}
