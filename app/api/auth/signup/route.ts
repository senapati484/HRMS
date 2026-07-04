import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { hashPassword } from "@/lib/auth";
import { generateEmployeeId } from "@/lib/idGenerator";

const signupSchema = z.object({
  role: z.enum(["admin", "employee"]).default("admin"),
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  companyName: z.string().optional(),
  companyLogo: z.string().optional(),
  employeeId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { role, name, email, password, companyName, companyLogo, employeeId } = parsed.data;

    await connectDB();

    if (role === "admin") {
      if (!companyName) {
        return NextResponse.json({ error: "Company name is required for admin signup" }, { status: 400 });
      }

      const existing = await User.findOne({ email });
      if (existing) {
        return NextResponse.json(
          { error: "A user with this email already exists." },
          { status: 409 }
        );
      }

      const generatedId = await generateEmployeeId(companyName, name);
      const passwordHash = await hashPassword(password);

      const user = await User.create({
        name,
        employeeId: generatedId,
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
    } else {
      if (!employeeId) {
        return NextResponse.json({ error: "Employee ID is required for registration" }, { status: 400 });
      }

      const user = await User.findOne({ employeeId });
      if (!user) {
        return NextResponse.json({ error: "Employee ID not found. Please ask your Admin to pre-create your account." }, { status: 404 });
      }

      if (user.isVerified) {
        return NextResponse.json({ error: "This employee account is already active. Please log in directly." }, { status: 400 });
      }

      const existingEmail = await User.findOne({ email, employeeId: { $ne: employeeId } });
      if (existingEmail) {
        return NextResponse.json({ error: "This email is already taken by another user." }, { status: 409 });
      }

      const passwordHash = await hashPassword(password);
      user.name = name;
      user.email = email;
      user.passwordHash = passwordHash;
      user.isVerified = true;
      await user.save();

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
        { status: 200 }
      );
    }
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
