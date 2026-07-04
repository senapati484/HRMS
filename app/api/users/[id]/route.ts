import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

// Fields an employee is allowed to update on their own profile
const EMPLOYEE_ALLOWED_FIELDS = ["phone", "address", "profilePicture"];

// Fields nobody should ever be able to set via PATCH
const BLOCKED_FIELDS = ["passwordHash", "_id", "__v", "createdAt", "updatedAt"];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get("hrms_token")?.value;
    const decoded = token ? verifyToken(token) : null;

    if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    // Employees can only fetch their own profile
    if (decoded.role !== "admin" && decoded.userId !== id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const user = await User.findById(id, "-passwordHash").lean();
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get("hrms_token")?.value;
    const decoded = token ? verifyToken(token) : null;

    if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();

    // Remove blocked fields from body regardless of caller
    BLOCKED_FIELDS.forEach((f) => delete body[f]);

    let updateData: Record<string, unknown>;

    if (decoded.role === "admin") {
      // Admin can update any field (except blocked ones above)
      updateData = body;
    } else {
      // Employee: only their own profile, only whitelisted fields
      if (decoded.userId !== id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      updateData = {};
      EMPLOYEE_ALLOWED_FIELDS.forEach((field) => {
        if (field in body) updateData[field] = body[field];
      });
    }

    await connectDB();
    const user = await User.findByIdAndUpdate(id, updateData, { new: true, select: "-passwordHash" }).lean();
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
