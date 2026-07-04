import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { sendEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("hrms_token")?.value;
    const decoded = token ? verifyToken(token) : null;
    if (!decoded || decoded.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    await connectDB();

    const user = await User.findByIdAndUpdate(
      userId,
      { isVerified: true },
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Send verification confirmation email
    sendEmail({
      to: user.email,
      subject: "Email Verified — Acme Corp HRMS",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;text-align:center">
          <div style="font-size:48px;margin-bottom:8px">✅</div>
          <h2 style="color:#16a34a;margin:0 0 8px">Email Verified!</h2>
          <p style="color:#6b7280;font-size:14px">Your HRMS account for <strong>${user.companyName || "Acme Corp"}</strong> has been verified. You can now log in and access the portal.</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login"
             style="display:inline-block;background:#2563eb;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;margin-top:16px">
            Sign In →
          </a>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0" />
          <p style="font-size:12px;color:#9ca3af">This is an automated message from Acme Corp HRMS.</p>
        </div>`,
    }).catch((e) => console.error("Email send failed:", e));

    return NextResponse.json({ success: true, message: "Email verified successfully." });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
