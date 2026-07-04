import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { Leave } from "@/models/Leave";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

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

    const leave = await Leave.findByIdAndUpdate(
      id,
      {
        status: parsed.data.status,
        hrComment: parsed.data.hrComment,
        decidedBy: decoded.userId,
        decidedAt: new Date(),
      },
      { new: true }
    ).populate("userId", "name employeeId");

    if (!leave) return NextResponse.json({ error: "Leave not found" }, { status: 404 });

    return NextResponse.json({ leave });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
