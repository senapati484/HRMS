import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { comparePassword, signToken } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().min(1), // Accept email or Employee ID
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const { email, password } = parsed.data;

    await connectDB();

    // Query by email OR employeeId (case insensitive search via uppercase/lowercase)
    const user = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { employeeId: email.toUpperCase() }
      ]
    });
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const passwordMatch = await comparePassword(password, user.passwordHash);
    if (!passwordMatch) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (!user.isVerified) {
      return NextResponse.json(
        { error: "Please verify your email first.", userId: user._id },
        { status: 403 }
      );
    }

    const token = signToken({ userId: user._id.toString(), role: user.role });

    const response = NextResponse.json({
      user: {
        _id: user._id,
        name: user.name,
        employeeId: user.employeeId,
        email: user.email,
        role: user.role,
        department: user.department,
        designation: user.designation,
        profilePicture: user.profilePicture,
      },
    });

    response.cookies.set("hrms_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
