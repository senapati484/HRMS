import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Attendance } from "@/models/Attendance";
import { Leave } from "@/models/Leave";
import DashboardClient from "@/components/DashboardClient";

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

  // Fetch all users, today's attendance status, and approved leaves for today
  const [usersRaw, attendancesRaw, leavesRaw] = await Promise.all([
    User.find({}).sort({ name: 1 }).lean(),
    Attendance.find({ date: today }).lean(),
    Leave.find({
      status: "Approved",
      startDate: { $lte: todayEnd },
      endDate: { $gte: todayStart }
    }).lean()
  ]);

  const employeesMapped = usersRaw.map((u: any) => {
    const att = attendancesRaw.find((a: any) => a.userId.toString() === u._id.toString());
    const leave = leavesRaw.find((l: any) => l.userId.toString() === u._id.toString());

    let status: "Present" | "Leave" | "Absent" = "Absent";
    if (leave) {
      status = "Leave";
    } else if (att && att.checkIn && !att.checkOut) {
      status = "Present";
    }

    return {
      ...u,
      _id: u._id.toString(),
      joinDate: u.joinDate ? u.joinDate.toISOString() : undefined,
      dob: u.dob ? u.dob.toISOString() : undefined,
      status,
      attendanceToday: att ? {
        checkIn: att.checkIn ? att.checkIn.toISOString() : undefined,
        checkOut: att.checkOut ? att.checkOut.toISOString() : undefined,
      } : undefined
    };
  });

  const currentUserSerialized = {
    ...user,
    _id: user._id.toString(),
    joinDate: user.joinDate ? user.joinDate.toISOString() : undefined,
    dob: user.dob ? user.dob.toISOString() : undefined,
  };

  return (
    <DashboardClient currentUser={currentUserSerialized} initialEmployees={employeesMapped} />
  );
}
