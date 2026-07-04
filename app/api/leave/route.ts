import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { Leave } from "@/models/Leave";
import { User } from "@/models/User";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { sendNewLeaveNotification } from "@/lib/email";
import policy from "@/lib/policy.json";

const leaveSchema = z.object({
  leaveType: z.enum(["Paid", "Sick", "Unpaid"]),
  startDate: z.string(),
  endDate: z.string(),
  remarks: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("hrms_token")?.value;
    const decoded = token ? verifyToken(token) : null;
    if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const all = searchParams.get("all") === "true" && decoded.role === "admin";

    const query: Record<string, unknown> = {};
    if (!all) {
      query.userId = decoded.userId;
    } else {
      const admin = await User.findById(decoded.userId, "companyName").lean() as any;
      const companyName = admin?.companyName;
      if (!companyName) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const companyUserIds = (await User.find({ companyName }, "_id").lean()).map(u => u._id);
      query.userId = { $in: companyUserIds };
    }
    if (status) query.status = status;

    const leaves = (await Leave.find(query)
      .populate("userId", "name employeeId department")
      .populate("decidedBy", "name")
      .sort({ createdAt: -1 })
      .lean()) as any[];

    return NextResponse.json({ leaves });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("hrms_token")?.value;
    const decoded = token ? verifyToken(token) : null;
    if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = leaveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { leaveType, startDate, endDate, remarks } = parsed.data;
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      return NextResponse.json(
        { error: "startDate must be on or before endDate" },
        { status: 400 }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (start < today) {
      return NextResponse.json(
        { error: "startDate cannot be in the past" },
        { status: 400 }
      );
    }

    await connectDB();

    // Check for overlapping leaves
    const overlapping = await Leave.findOne({
      userId: decoded.userId,
      status: { $ne: "Rejected" },
      startDate: { $lte: end },
      endDate: { $gte: start },
    });
    if (overlapping) {
      return NextResponse.json(
        { error: "You already have a leave request overlapping these dates" },
        { status: 409 }
      );
    }

    // Check leave balance
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(`${currentYear}-01-01`);
    const endOfYear = new Date(`${currentYear}-12-31`);
    const approvedThisYear = await Leave.find({
      userId: decoded.userId,
      status: "Approved",
      leaveType,
      startDate: { $gte: startOfYear, $lte: endOfYear },
    });
    const daysUsed = approvedThisYear.reduce((sum, l) => {
      const days = Math.ceil((l.endDate.getTime() - l.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return sum + days;
    }, 0);
    const requestedDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const policyLimit = leaveType === "Paid" ? policy.annual_paid_leave : leaveType === "Sick" ? policy.annual_sick_leave : policy.annual_unpaid_leave;
    if (daysUsed + requestedDays > policyLimit) {
      return NextResponse.json(
        { error: `Insufficient ${leaveType} leave balance. Used ${daysUsed} of ${policyLimit}, requesting ${requestedDays}.` },
        { status: 400 }
      );
    }

    const leave = await Leave.create({
      userId: decoded.userId,
      leaveType,
      startDate: start,
      endDate: end,
      remarks,
      status: "Pending",
    });

    // Notify admin(s) in the same company
    const employee = await User.findById(decoded.userId, "name employeeId companyName").lean() as any;
    if (employee?.companyName) {
      const admins = await User.find({ role: "admin", companyName: employee.companyName }, "name email").lean() as any[];
      for (const admin of admins) {
        sendNewLeaveNotification(
          { name: admin.name, email: admin.email },
          { name: employee.name, employeeId: employee.employeeId },
          { leaveType, startDate: start, endDate: end, remarks },
        ).catch((e) => console.error("Email send failed:", e));
      }
    }

    return NextResponse.json({ leave }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
