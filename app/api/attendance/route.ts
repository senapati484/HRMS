import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Attendance } from "@/models/Attendance";
import { User } from "@/models/User";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

// Configurable late threshold (10:30 AM)
const LATE_THRESHOLD_HOUR = 10;
const LATE_THRESHOLD_MINUTE = 30;

function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("hrms_token")?.value;
    const decoded = token ? verifyToken(token) : null;
    if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const allUsers = searchParams.get("all") === "true" && decoded.role === "admin";
    const targetUserId = searchParams.get("userId");

    const query: Record<string, unknown> = {};

    if (!allUsers) {
      const userId = targetUserId && decoded.role === "admin" ? targetUserId : decoded.userId;

      if (decoded.role === "admin" && targetUserId) {
        const admin = await User.findById(decoded.userId, "companyName").lean() as any;
        const target = await User.findById(targetUserId, "companyName").lean() as any;
        if (admin?.companyName && target?.companyName && admin.companyName !== target.companyName) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }

      query.userId = userId;
    } else {
      const admin = await User.findById(decoded.userId, "companyName").lean() as any;
      const companyName = admin?.companyName;
      if (companyName) {
        const companyUserIds = (await User.find({ companyName }, "_id").lean()).map(u => u._id);
        query.userId = { $in: companyUserIds };
      }
    }

    if (from || to) {
      query.date = {};
      if (from) (query.date as Record<string, string>).$gte = from;
      if (to) (query.date as Record<string, string>).$lte = to;
    }

    const records = (await Attendance.find(query)
      .populate("userId", "name employeeId department")
      .sort({ date: -1 })
      .lean()) as any[];

    return NextResponse.json({ attendance: records });
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

    await connectDB();

    const today = getTodayString();
    const now = new Date();

    let record = await Attendance.findOne({ userId: decoded.userId, date: today });

    if (!record) {
      // First call of the day — check in
      record = await Attendance.create({
        userId: decoded.userId,
        date: today,
        checkIn: now,
        status: "Present",
      });
      return NextResponse.json({ attendance: record, action: "checked-in" });
    }

    if (record.checkIn && !record.checkOut) {
      // Second call — check out, compute status
      const checkInTime = new Date(record.checkIn);
      const lateThreshold = new Date(checkInTime);
      lateThreshold.setHours(LATE_THRESHOLD_HOUR, LATE_THRESHOLD_MINUTE, 0, 0);

      const status = checkInTime > lateThreshold ? "HalfDay" : "Present";
      record.checkOut = now;
      record.status = status;
      await record.save();
      return NextResponse.json({ attendance: record, action: "checked-out" });
    }

    // Already checked out
    return NextResponse.json(
      { error: "Already checked in and checked out today.", attendance: record },
      { status: 400 }
    );
  } catch (error) {
    // Handle unique index violation gracefully
    if ((error as { code?: number }).code === 11000) {
      return NextResponse.json(
        { error: "Attendance record already exists for today." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
