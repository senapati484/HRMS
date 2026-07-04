import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Payroll } from "@/models/Payroll";
import { User } from "@/models/User";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get("hrms_token")?.value;
    const decoded = token ? verifyToken(token) : null;

    if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Employees can only access their own payroll
    if (decoded.role !== "admin" && decoded.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const payroll = (await Payroll.findOne({ userId }).populate("userId", "name employeeId").lean({ virtuals: true })) as any;
    if (!payroll) return NextResponse.json({ error: "Payroll not found" }, { status: 404 });

    // lean() drops Mongoose virtuals — compute net explicitly
    const withNet = { ...payroll, net: (payroll.basic ?? 0) + (payroll.allowances ?? 0) - (payroll.deductions ?? 0) };

    return NextResponse.json({ payroll: withNet });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

import { z } from "zod";

const payrollSchema = z.object({
  monthlyWage: z.number().min(0).optional(),
  workingDaysPerWeek: z.number().min(1).optional(),
  breakTime: z.number().min(0).optional(),
  basic: z.number().min(0).optional(),
  allowances: z.number().min(0).optional(),
  deductions: z.number().min(0).optional(),
  bonus: z.number().min(0).optional(),
  payCycle: z.enum(["monthly", "bi-weekly", "weekly"]).optional(),
  currency: z.string().optional(),
  taxId: z.string().optional(),
  pfNumber: z.string().optional(),
  esiNumber: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get("hrms_token")?.value;
    const decoded = token ? verifyToken(token) : null;

    if (!decoded || decoded.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = payrollSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const updateData = parsed.data;

    await connectDB();

    const [admin, target] = await Promise.all([
      User.findById(decoded.userId, "companyName").lean(),
      User.findById(userId, "companyName").lean(),
    ]);
    const adminCompany = (admin as any)?.companyName;
    const targetCompany = (target as any)?.companyName;
    if (adminCompany && targetCompany && adminCompany !== targetCompany) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Use .findOne() and .save() to properly trigger Mongoose pre-save middleware calculations
    let payroll = await Payroll.findOne({ userId });
    if (!payroll) {
      payroll = new Payroll({ userId });
    }

    if (updateData.monthlyWage !== undefined) payroll.monthlyWage = updateData.monthlyWage;
    if (updateData.workingDaysPerWeek !== undefined) payroll.workingDaysPerWeek = updateData.workingDaysPerWeek;
    if (updateData.breakTime !== undefined) payroll.breakTime = updateData.breakTime;
    
    if (updateData.basic !== undefined) payroll.basic = updateData.basic;
    if (updateData.allowances !== undefined) payroll.allowances = updateData.allowances;
    if (updateData.deductions !== undefined) payroll.deductions = updateData.deductions;
    if (updateData.bonus !== undefined) payroll.bonus = updateData.bonus;
    if (updateData.payCycle !== undefined) payroll.payCycle = updateData.payCycle;
    if (updateData.currency !== undefined) payroll.currency = updateData.currency;
    if (updateData.taxId !== undefined) payroll.taxId = updateData.taxId;
    if (updateData.pfNumber !== undefined) payroll.pfNumber = updateData.pfNumber;
    if (updateData.esiNumber !== undefined) payroll.esiNumber = updateData.esiNumber;

    payroll.updatedBy = decoded.userId;
    await payroll.save();

    // Convert to object and include virtuals (e.g. net take-home pay)
    const withNet = payroll.toObject({ virtuals: true });

    return NextResponse.json({ payroll: withNet });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
