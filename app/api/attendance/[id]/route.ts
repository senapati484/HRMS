import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { Attendance } from "@/models/Attendance";
import { User } from "@/models/User";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

const patchSchema = z.object({
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  status: z.enum(["Present", "Absent", "HalfDay"]).optional(),
  date: z.string().optional(),
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
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    await connectDB();

    const existing = await Attendance.findById(id).lean() as any;
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const [admin, target] = await Promise.all([
      User.findById(decoded.userId, "companyName").lean(),
      User.findById(existing.userId, "companyName").lean(),
    ]);
    const adminCompany = (admin as any)?.companyName;
    const targetCompany = (target as any)?.companyName;
    if ((adminCompany && targetCompany && adminCompany !== targetCompany) || !adminCompany) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const record = await Attendance.findByIdAndUpdate(id, parsed.data, { new: true });
    return NextResponse.json({ attendance: record });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
