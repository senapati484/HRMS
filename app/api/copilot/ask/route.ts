import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import { Leave } from "@/models/Leave";
import { Attendance } from "@/models/Attendance";
import { User } from "@/models/User";
import { Payroll } from "@/models/Payroll";
import policy from "@/lib/policy.json";
import { GoogleGenAI } from "@google/genai";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

function getAI() {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not set");
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("hrms_token")?.value;
    const decoded = token ? verifyToken(token) : null;
    if (!decoded) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { question } = await request.json();
    if (!question?.trim()) {
      return new Response("question is required", { status: 400 });
    }

    await connectDB();

    // Convert string userId to ObjectId for reliable Mongoose queries
    const userObjectId = new mongoose.Types.ObjectId(decoded.userId);

    // Fetch all employee data in parallel
    const [user, payrollDoc, allLeaves, recentAttendance] = await Promise.all([
      User.findById(userObjectId, "-passwordHash").lean().exec() as Promise<any>,
      Payroll.findOne({ userId: userObjectId }).lean().exec() as Promise<any>,
      Leave.find({ userId: userObjectId })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean()
        .exec() as Promise<any[]>,
      Attendance.find({ userId: userObjectId })
        .sort({ date: -1 })
        .limit(30)
        .lean()
        .exec() as Promise<any[]>,
    ]);

    // ── Leave balance computation ─────────────────────────────────────────
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(`${currentYear}-01-01`);
    const endOfYear = new Date(`${currentYear}-12-31`);

    const approvedThisYear = (allLeaves || []).filter(
      (l: any) =>
        l.status === "Approved" &&
        new Date(l.startDate) >= startOfYear &&
        new Date(l.startDate) <= endOfYear
    );

    const used: Record<string, number> = { Paid: 0, Sick: 0, Unpaid: 0 };
    for (const leave of approvedThisYear) {
      const days =
        Math.ceil(
          (new Date(leave.endDate).getTime() - new Date(leave.startDate).getTime()) /
            (1000 * 60 * 60 * 24)
        ) + 1;
      used[leave.leaveType] = (used[leave.leaveType] || 0) + days;
    }

    const remaining = {
      Paid: policy.annual_paid_leave - (used.Paid || 0),
      Sick: policy.annual_sick_leave - (used.Sick || 0),
      Unpaid: policy.annual_unpaid_leave - (used.Unpaid || 0),
    };

    // ── Attendance data ───────────────────────────────────────────────────
    const attendanceList = (recentAttendance || []).map((a: any) => ({
      date: a.date,
      status: a.status,
      checkIn: a.checkIn
        ? new Date(a.checkIn).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
        : null,
      checkOut: a.checkOut
        ? new Date(a.checkOut).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
        : null,
    }));

    const presentCount = attendanceList.filter((a) => a.status === "Present").length;
    const absentCount = attendanceList.filter((a) => a.status === "Absent").length;
    const halfDayCount = attendanceList.filter((a) => a.status === "HalfDay").length;

    // ── Payroll summary ───────────────────────────────────────────────────
    const payrollSummary = payrollDoc
      ? {
          basic: payrollDoc.basic ?? 0,
          allowances: payrollDoc.allowances ?? 0,
          deductions: payrollDoc.deductions ?? 0,
          bonus: payrollDoc.bonus ?? 0,
          payCycle: payrollDoc.payCycle ?? "monthly",
          currency: payrollDoc.currency ?? "INR",
          net:
            (payrollDoc.basic ?? 0) +
            (payrollDoc.allowances ?? 0) -
            (payrollDoc.deductions ?? 0),
        }
      : null;

    // ── Leave history list ────────────────────────────────────────────────
    const leaveHistory = (allLeaves || []).slice(0, 10).map((l: any) => ({
      type: l.leaveType,
      from: new Date(l.startDate).toISOString().split("T")[0],
      to: new Date(l.endDate).toISOString().split("T")[0],
      status: l.status,
      reason: l.remarks || "",
    }));

    const companyName = user?.companyName ?? "Acme Corp";

    // ── Build system prompt with ALL real data ────────────────────────────
    const systemPrompt = `You are a friendly, knowledgeable HR assistant for ${companyName}. You have REAL-TIME access to this employee's HR data fetched directly from the database right now. Use it to answer accurately and helpfully.

TODAY: ${new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}

━━━ EMPLOYEE PROFILE ━━━
Name: ${user?.name ?? "Unknown"}
Employee ID: ${user?.employeeId ?? "N/A"}
Department: ${user?.department ?? "N/A"}
Designation: ${user?.designation ?? "N/A"}
Role: ${user?.role ?? "employee"}
Join Date: ${user?.joinDate ? new Date(user.joinDate).toLocaleDateString("en-IN") : "N/A"}

━━━ LEAVE BALANCES (${currentYear}) ━━━
Paid Leave:   ${remaining.Paid} days remaining  (used ${used.Paid || 0} of ${policy.annual_paid_leave})
Sick Leave:   ${remaining.Sick} days remaining  (used ${used.Sick || 0} of ${policy.annual_sick_leave})
Unpaid Leave: ${remaining.Unpaid} days remaining (used ${used.Unpaid || 0} of ${policy.annual_unpaid_leave})

━━━ LEAVE HISTORY (recent ${leaveHistory.length} requests) ━━━
${
  leaveHistory.length > 0
    ? leaveHistory
        .map(
          (l) =>
            `• ${l.type} | ${l.from} to ${l.to} | ${l.status}${l.reason ? ` | "${l.reason}"` : ""}`
        )
        .join("\n")
    : "No leave requests on record."
}

━━━ ATTENDANCE (last ${attendanceList.length} records) ━━━
Summary: ${presentCount} Present | ${halfDayCount} Half Day | ${absentCount} Absent
${attendanceList.length > 0 ? attendanceList.slice(0, 15).map((a) => `• ${a.date}: ${a.status}${a.checkIn ? ` (in: ${a.checkIn}${a.checkOut ? `, out: ${a.checkOut}` : ""})` : ""}`).join("\n") : "No attendance records found."}

━━━ PAYROLL ━━━
${
  payrollSummary
    ? `Basic Salary: ₹${payrollSummary.basic.toLocaleString("en-IN")}
Allowances:   +₹${payrollSummary.allowances.toLocaleString("en-IN")}
Deductions:   -₹${payrollSummary.deductions.toLocaleString("en-IN")}
Bonus:        ₹${payrollSummary.bonus.toLocaleString("en-IN")}
Pay Cycle:    ${payrollSummary.payCycle}
Currency:     ${payrollSummary.currency}
Net Take-Home: ₹${payrollSummary.net.toLocaleString("en-IN")}`
    : "Payroll not configured yet. Ask HR admin to set it up."
}

━━━ COMPANY LEAVE POLICY ━━━
${policy.rules.map((r: string, i: number) => `${i + 1}. ${r}`).join("\n")}
• Carry-forward limit: ${policy.carry_forward_limit} days/year
• Unpaid leave advance notice: ${policy.unpaid_leave_notice_days} days

━━━ HOW TO ANSWER ━━━
- Use the real data above. You have all the information you need.
- Be warm, conversational, and direct.
- For attendance questions, reference the actual dates and counts shown above.
- For leave balance, always mention both remaining AND used counts.
- Never say you don't have information unless it's genuinely absent from above.
- Keep responses concise (2-5 sentences) unless a breakdown is explicitly needed.`;

    // ── Stream the response ───────────────────────────────────────────────
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const responseStream = await getAI().models.generateContentStream({
            model: "gemini-2.5-flash",
            contents: `${systemPrompt}\n\n---\nEMPLOYEE QUESTION: ${question}`,
          });

          for await (const chunk of responseStream) {
            const text = chunk.text ?? "";
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
        } catch (err) {
          controller.enqueue(
            encoder.encode(
              `Sorry, I ran into an error: ${(err as Error).message}`
            )
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Accel-Buffering": "no",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return new Response((error as Error).message, { status: 500 });
  }
}
