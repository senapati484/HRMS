import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import { Leave } from "@/models/Leave";
import { Attendance } from "@/models/Attendance";
import { User } from "@/models/User";

// Rule-based — no AI. 100% reliable in demo.
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("hrms_token")?.value;
    const decoded = token ? verifyToken(token) : null;

    if (!decoded || decoded.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const adminUser = await User.findById(decoded.userId, "companyName").lean() as any;
    const companyName = adminUser?.companyName;

    const flags: Array<{ type: string; employeeName: string; detail: string; refId?: string }> = [];

    // Rule 1: Pending leave requests older than 48 hours
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const staleQuery: Record<string, any> = {
      status: "Pending",
      createdAt: { $lt: fortyEightHoursAgo },
    };
    if (companyName) {
      const companyUserIds = (await User.find({ companyName }, "_id").lean()).map(u => u._id);
      staleQuery.userId = { $in: companyUserIds };
    }
    const stalePending = (await Leave.find(staleQuery).populate("userId", "name").lean()) as any[];

    for (const leave of stalePending) {
      const userName = (leave.userId as { name: string })?.name ?? "Unknown";
      const hoursAgo = Math.floor((Date.now() - new Date(leave.createdAt).getTime()) / (1000 * 60 * 60));
      flags.push({
        type: "stale_leave",
        employeeName: userName,
        detail: `Leave request pending for ${hoursAgo}h — needs decision.`,
        refId: leave._id?.toString(),
      });
    }

    // Rule 2 & 3: Attendance anomalies this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

    const employeeFilter: Record<string, any> = { role: "employee" };
    if (companyName) employeeFilter.companyName = companyName;
    const employees = (await User.find(employeeFilter, "_id name").lean()) as any[];

    const absenceCounts: Record<string, { name: string; count: number }> = {};
    for (const emp of employees) {
      const absences = await Attendance.countDocuments({
        userId: emp._id,
        date: { $gte: startOfMonth, $lte: endOfMonth },
        status: "Absent",
      });
      absenceCounts[emp._id.toString()] = { name: emp.name, count: absences };
    }

    const ABSENCE_THRESHOLD = 3;
    const counts = Object.values(absenceCounts).map((e) => e.count);
    const teamAvg = counts.length > 0 ? counts.reduce((a, b) => a + b, 0) / counts.length : 0;

    for (const [, data] of Object.entries(absenceCounts)) {
      if (data.count > ABSENCE_THRESHOLD) {
        flags.push({
          type: "high_absences",
          employeeName: data.name,
          detail: `${data.count} unplanned absences this month (threshold: ${ABSENCE_THRESHOLD}).`,
        });
      } else if (teamAvg > 0 && data.count > teamAvg * 1.5) {
        flags.push({
          type: "above_avg_absences",
          employeeName: data.name,
          detail: `${data.count} absences this month — ${((data.count / teamAvg) * 100 - 100).toFixed(0)}% above team average (${teamAvg.toFixed(1)}).`,
        });
      }
    }

    return NextResponse.json({ flags });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
