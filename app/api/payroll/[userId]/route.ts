import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Payroll } from "@/models/Payroll";
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

    return NextResponse.json({ payroll });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

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
    const { basic, allowances, deductions } = body;

    await connectDB();

    const payroll = (await Payroll.findOneAndUpdate(
      { userId },
      {
        ...(basic !== undefined && { basic }),
        ...(allowances !== undefined && { allowances }),
        ...(deductions !== undefined && { deductions }),
        updatedBy: decoded.userId,
      },
      { new: true, upsert: true }
    ).lean({ virtuals: true })) as any;

    return NextResponse.json({ payroll });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
