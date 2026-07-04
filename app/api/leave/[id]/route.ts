import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { Leave } from "@/models/Leave";
import { User } from "@/models/User";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { sendLeaveStatusNotification } from "@/lib/email";
import policy from "@/lib/policy.json";

const decisionSchema = z.object({
  status: z.enum(["Approved", "Rejected"]),
  hrComment: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get("hrms_token")?.value;
    const decoded = token ? verifyToken(token) : null;

    if (!decoded || decoded.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = decisionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    await connectDB();

    const existing = await Leave.findById(id).lean() as any;
    if (!existing) return NextResponse.json({ error: "Leave not found" }, { status: 404 });

    const [admin, target] = await Promise.all([
      User.findById(decoded.userId, "companyName").lean(),
      User.findById(existing.userId, "companyName").lean(),
    ]);
    const adminCompany = (admin as any)?.companyName;
    const targetCompany = (target as any)?.companyName;
    if (!adminCompany || adminCompany !== targetCompany) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (parsed.data.status === "Approved") {
      const leaveType = existing.leaveType;
      const start = new Date(existing.startDate);
      const end = new Date(existing.endDate);
      const requestedDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      const currentYear = new Date().getFullYear();
      const startOfYear = new Date(`${currentYear}-01-01`);
      const endOfYear = new Date(`${currentYear}-12-31`);
      const approvedThisYear = await Leave.find({
        userId: existing.userId,
        _id: { $ne: id },
        status: "Approved",
        leaveType,
        startDate: { $gte: startOfYear, $lte: endOfYear },
      });
      const daysUsed = approvedThisYear.reduce((sum, l) => {
        const d = Math.ceil((l.endDate.getTime() - l.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return sum + d;
      }, 0);
      const policyLimit = leaveType === "Paid" ? policy.annual_paid_leave : leaveType === "Sick" ? policy.annual_sick_leave : policy.annual_unpaid_leave;
      if (daysUsed + requestedDays > policyLimit) {
        return NextResponse.json(
          { error: `Insufficient ${leaveType} leave balance. Used ${daysUsed} of ${policyLimit}, approving would add ${requestedDays}.` },
          { status: 400 }
        );
      }
    }

    const leave = await Leave.findByIdAndUpdate(
      id,
      {
        status: parsed.data.status,
        hrComment: parsed.data.hrComment,
        decidedBy: decoded.userId,
        decidedAt: new Date(),
      },
      { new: true }
    ).populate("userId", "name employeeId email personalEmail");

    const leaveData = leave?.toObject?.() ?? leave ?? {};
    const emp = (leaveData as any).userId;
    if (emp) {
      sendLeaveStatusNotification(
        { name: emp.name, email: emp.email, personalEmail: emp.personalEmail, employeeId: emp.employeeId },
        { leaveType: (leaveData as any).leaveType, startDate: (leaveData as any).startDate, endDate: (leaveData as any).endDate, status: parsed.data.status, hrComment: parsed.data.hrComment },
      ).catch((e) => console.error("Email send failed:", e));
    }

    return NextResponse.json({ leave });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
