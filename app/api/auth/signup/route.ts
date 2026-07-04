import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { hashPassword } from "@/lib/auth";

const signupSchema = z.object({
  name: z.string().min(2),
  employeeId: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["employee", "admin"]),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { name, employeeId, email, password, role } = parsed.data;

    await connectDB();

    const existing = await User.findOne({ $or: [{ email }, { employeeId }] });
    if (existing) {
      return NextResponse.json(
        { error: "A user with this email or employee ID already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const user = await User.create({
      name,
      employeeId,
      email,
      passwordHash,
      role,
      isVerified: false,
    });

    return NextResponse.json(
      {
        user: {
          _id: user._id,
          name: user.name,
          employeeId: user.employeeId,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
