import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { hashPassword } from "@/lib/auth";
import { generateEmployeeId } from "@/lib/idGenerator";

const signupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  companyName: z.string().min(2),
  companyLogo: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { name, email, password, companyName, companyLogo } = parsed.data;

    await connectDB();

    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists." },
        { status: 409 }
      );
    }

    const employeeId = await generateEmployeeId(companyName, name);
    const passwordHash = await hashPassword(password);

    const user = await User.create({
      name,
      employeeId,
      email,
      passwordHash,
      role: "admin",
      companyName,
      companyLogo,
      isVerified: true,
    });

    return NextResponse.json(
      {
        user: {
          _id: user._id,
          name: user.name,
          employeeId: user.employeeId,
          email: user.email,
          role: user.role,
          companyName: user.companyName,
          companyLogo: user.companyLogo,
          isVerified: user.isVerified,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
