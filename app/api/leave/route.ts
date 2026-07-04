import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { Leave } from "@/models/Leave";
import { User } from "@/models/User";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { sendNewLeaveNotification } from "@/lib/email";

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
      if (companyName) {
        const companyUserIds = (await User.find({ companyName }, "_id").lean()).map(u => u._id);
        query.userId = { $in: companyUserIds };
      }
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

    await connectDB();

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
