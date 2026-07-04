import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Attendance } from "@/models/Attendance";
import { Leave } from "@/models/Leave";
import CopilotAsk from "@/components/CopilotAsk";
import Link from "next/link";
import { 
  Calendar, 
  Palmtree, 
  CircleDollarSign, 
  User as UserIcon, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  TrendingUp 
} from "lucide-react";

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
    (await Attendance.find({ userId: decoded.userId }).sort({ date: -1 }).limit(5).lean()) as any[],
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
      label: `${l.leaveType} Leave Request: ${l.status}`,
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
    .slice(0, 5);

  const quickLinks = [
    { href: "/attendance", label: "Attendance", icon: Calendar, desc: "Check in / Check out" },
    { href: "/leave", label: "Leave", icon: Palmtree, desc: "Apply for time off" },
    { href: "/payroll", label: "Payroll", icon: CircleDollarSign, desc: "View your salary" },
    { href: "/profile", label: "Profile", icon: UserIcon, desc: "View & edit your info" },
  ];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      {/* Welcome banner */}
      <div
        className="rounded-2xl p-6 border flex items-center justify-between glass-panel relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.06))",
          borderColor: "rgba(99,102,241,0.2)",
        }}
      >
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {greeting}, {user.name.split(" ")[0]} 👋
          </h1>
          <p className="text-sm font-medium" style={{ color: "var(--muted)" }}>
            {user.designation} · {user.department} ·{" "}
            <span className="font-mono text-xs opacity-75">{user.employeeId}</span>
          </p>
        </div>
        <div className="text-right hidden sm:block font-precise">
          <p className="text-sm font-semibold text-white">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          {todayAttendance ? (
            <p className="text-xs mt-1.5 flex items-center gap-1.5 justify-end" style={{ color: "var(--success)" }}>
              <CheckCircle2 size={14} /> Checked {todayAttendance.checkOut ? "out" : "in"} today
            </p>
          ) : (
            <p className="text-xs mt-1.5 flex items-center gap-1.5 justify-end" style={{ color: "var(--warning)" }}>
              <Clock size={14} /> Not checked in yet
            </p>
          )}
        </div>
      </div>

      {/* Quick access */}
      <div>
        <h2 className="text-[10px] font-bold mb-4 tracking-widest uppercase font-precise" style={{ color: "var(--muted)", opacity: 0.6 }}>
          Quick Action Portal
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickLinks.map(({ href, label, icon: Icon, desc }) => (
            <Link
              key={href}
              href={href}
              className="rounded-2xl p-5 border transition-all duration-300 hover:-translate-y-1 hover:border-indigo-500/50 block group cursor-pointer glass-panel"
            >
              <div className="text-indigo-400 mb-3 group-hover:text-indigo-300 transition-colors">
                <Icon size={24} />
              </div>
              <div className="font-bold text-white text-sm group-hover:text-indigo-300 transition-colors font-precise">
                {label}
              </div>
              <div className="text-xs mt-1.5" style={{ color: "var(--muted)" }}>
                {desc}
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent activity */}
        <div
          className="rounded-2xl border p-6 glass-panel"
        >
          <h2 className="font-bold text-white mb-5 text-sm tracking-wide uppercase font-precise flex items-center gap-2">
            <TrendingUp size={16} className="text-indigo-400" /> Recent Log Activity
          </h2>
          {activity.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <div className="text-3xl">📭</div>
              <p className="text-sm font-medium" style={{ color: "var(--muted)" }}>
                No recent activity records.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activity.map((item, i) => (
                <div key={i} className="flex items-center gap-4 text-sm py-2 border-b last:border-0 border-white/5">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: item.color, boxShadow: `0 0 8px ${item.color}` }}
                  />
                  <span className="text-white font-medium flex-1">{item.label}</span>
                  <span className="font-mono text-xs" style={{ color: "var(--muted)" }}>{item.date}</span>
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
