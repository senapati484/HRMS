import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Attendance } from "@/models/Attendance";
import { Leave } from "@/models/Leave";
import DashboardClient from "@/components/DashboardClient";

function toPlain<T>(doc: T): T {
  return JSON.parse(JSON.stringify(doc));
}

export default async function EmployeeDashboard() {
  const cookieStore = await cookies();
  const token = cookieStore.get("hrms_token")?.value;
  const decoded = token ? verifyToken(token) : null;
  if (!decoded) redirect("/login");

  await connectDB();

  const user = (await User.findById(decoded.userId, "-passwordHash").lean()) as any;
  if (!user) redirect("/login");

  const today = new Date().toISOString().split("T")[0];
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const companyFilter = user.companyName ? { companyName: user.companyName } : {};

  const [usersRaw, attendancesRaw, leavesRaw] = await Promise.all([
    User.find(companyFilter).sort({ name: 1 }).lean(),
    Attendance.find({ date: today }).lean(),
    Leave.find({
      status: "Approved",
      startDate: { $lte: todayEnd },
      endDate: { $gte: todayStart }
    }).lean()
  ]);

  const [recentAttendanceRaw, recentLeavesRaw] = await Promise.all([
    Attendance.find({ userId: decoded.userId }).sort({ date: -1 }).limit(5).lean(),
    Leave.find({ userId: decoded.userId }).sort({ createdAt: -1 }).limit(5).lean()
  ]);

  const employeesMapped = usersRaw.map((u: any) => {
    const att = attendancesRaw.find((a: any) => a.userId && a.userId.toString() === u._id.toString());
    const leave = leavesRaw.find((l: any) => l.userId && l.userId.toString() === u._id.toString());

    let status: "Present" | "Leave" | "Absent" = "Absent";
    if (leave) {
      status = "Leave";
    } else if (att && att.checkIn && !att.checkOut) {
      status = "Present";
    }

    return toPlain({
      ...u,
      _id: u._id.toString(),
      joinDate: u.joinDate ? u.joinDate.toISOString() : undefined,
      dob: u.dob ? u.dob.toISOString() : undefined,
      status,
      attendanceToday: att ? {
        checkIn: att.checkIn ? att.checkIn.toISOString() : undefined,
        checkOut: att.checkOut ? att.checkOut.toISOString() : undefined,
      } : undefined
    });
  });

  const currentUserSerialized = toPlain({
    ...user,
    _id: user._id.toString(),
    joinDate: user.joinDate ? user.joinDate.toISOString() : undefined,
    dob: user.dob ? user.dob.toISOString() : undefined,
  });

  const recentAttendanceSerialized = recentAttendanceRaw.map((a: any) => toPlain({
    ...a,
    _id: a._id.toString(),
    checkIn: a.checkIn ? a.checkIn.toISOString() : undefined,
    checkOut: a.checkOut ? a.checkOut.toISOString() : undefined,
  }));

  const recentLeavesSerialized = recentLeavesRaw.map((l: any) => toPlain({
    ...l,
    _id: l._id.toString(),
    startDate: l.startDate ? l.startDate.toISOString() : undefined,
    endDate: l.endDate ? l.endDate.toISOString() : undefined,
    createdAt: l.createdAt ? l.createdAt.toISOString() : undefined,
  }));

  return (
    <DashboardClient 
      currentUser={currentUserSerialized} 
      initialEmployees={employeesMapped}
      recentAttendance={recentAttendanceSerialized}
      recentLeaves={recentLeavesSerialized}
    />
  );
}
