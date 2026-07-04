import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { z } from "zod";
import { hashPassword } from "@/lib/auth";
import { generateEmployeeId } from "@/lib/idGenerator";
import { Payroll } from "@/models/Payroll";
import { sendNewEmployeeCredentials } from "@/lib/email";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("hrms_token")?.value;
    const decoded = token ? verifyToken(token) : null;

    if (!decoded || decoded.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();
    const admin = await User.findById(decoded.userId, "companyName").lean() as any;
    const companyName = admin?.companyName;
    if (!companyName) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const users = (await User.find({ companyName }, "-passwordHash").sort({ createdAt: -1 }).lean()) as any[];
    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  joinDate: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("hrms_token")?.value;
    const decoded = token ? verifyToken(token) : null;

    if (!decoded || decoded.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { name, email, phone, department, designation, joinDate } = parsed.data;

    await connectDB();

    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json({ error: "User with this email already exists." }, { status: 409 });
    }

    // Find the admin's company details
    const adminUser = await User.findById(decoded.userId);
    if (!adminUser?.companyName) {
      return NextResponse.json({ error: "Admin has no company configured" }, { status: 403 });
    }
    const companyName = adminUser.companyName;
    const companyLogo = adminUser?.companyLogo;

    const parsedJoinDate = joinDate ? new Date(joinDate) : new Date();
    const employeeId = await generateEmployeeId(companyName, name, parsedJoinDate);

    // Auto-generated temporary password
    const { randomBytes } = await import("crypto");
    const tempPassword = randomBytes(12).toString("hex");
    const passwordHash = await hashPassword(tempPassword);

    const user = await User.create({
      name,
      employeeId,
      email,
      passwordHash,
      role: "employee",
      phone,
      department,
      designation,
      joinDate: parsedJoinDate,
      companyName,
      companyLogo,
      isVerified: true,
    });

    // Create a default Payroll configuration for the new user (Wage = 30000)
    await Payroll.create({
      userId: user._id,
      monthlyWage: 30000,
      workingDaysPerWeek: 5,
      breakTime: 1,
      updatedBy: decoded.userId,
    });

    // Send credentials email
    sendNewEmployeeCredentials(
      { name: user.name, email: user.email, employeeId: user.employeeId },
      tempPassword,
      companyName,
    ).catch((e) => console.error("Email send failed:", e));

    return NextResponse.json(
      {
        user: {
          _id: user._id,
          name: user.name,
          employeeId: user.employeeId,
          email: user.email,
          role: user.role,
        },
        tempPassword,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
