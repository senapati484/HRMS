import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import { Leave } from "@/models/Leave";
import { Attendance } from "@/models/Attendance";
import { User } from "@/models/User";
import { Payroll } from "@/models/Payroll";
import policy from "@/lib/policy.json";
import { GoogleGenAI } from "@google/genai";

if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not set");
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

    // ── Gather FULL employee context ──────────────────────────────────────
    const [user, payrollDoc, allLeaves, recentAttendance] = await Promise.all([
      (await User.findById(decoded.userId, "-passwordHash").lean()) as any,
      (await Payroll.findOne({ userId: decoded.userId }).lean()) as any,
      (await Leave.find({ userId: decoded.userId }).sort({ createdAt: -1 }).limit(20).lean()) as any[],
      (await Attendance.find({ userId: decoded.userId }).sort({ date: -1 }).limit(30).lean()) as any[],
    ]);

    // Leave balance computation
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(`${currentYear}-01-01`);
    const endOfYear = new Date(`${currentYear}-12-31`);

    const approvedThisYear = allLeaves.filter(
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
      Paid: policy.annual_paid_leave - used.Paid,
      Sick: policy.annual_sick_leave - used.Sick,
      Unpaid: policy.annual_unpaid_leave - used.Unpaid,
    };

    // Attendance summary
    const attendanceSummary = {
      totalDays: recentAttendance.length,
      present: recentAttendance.filter((a: any) => a.status === "Present").length,
      absent: recentAttendance.filter((a: any) => a.status === "Absent").length,
      halfDay: recentAttendance.filter((a: any) => a.status === "HalfDay").length,
    };

    // Payroll summary
    const payrollSummary = payrollDoc
      ? {
          basic: payrollDoc.basic,
          allowances: payrollDoc.allowances,
          deductions: payrollDoc.deductions,
          net: (payrollDoc.basic ?? 0) + (payrollDoc.allowances ?? 0) - (payrollDoc.deductions ?? 0),
        }
      : null;

    // Recent leave requests
    const recentLeaveList = allLeaves.slice(0, 5).map((l: any) => ({
      type: l.leaveType,
      from: new Date(l.startDate).toISOString().split("T")[0],
      to: new Date(l.endDate).toISOString().split("T")[0],
      status: l.status,
      remarks: l.remarks || "",
    }));

    // ── Build rich system prompt ──────────────────────────────────────────
    const systemPrompt = `You are an intelligent HR assistant for Acme Corp's HRMS. You have complete, real-time context about this employee. Be helpful, conversational, and precise. Use the data below to answer accurately.

TODAY: ${new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}

═══ EMPLOYEE PROFILE ═══
Name: ${user?.name ?? "Unknown"}
Employee ID: ${user?.employeeId ?? "N/A"}
Department: ${user?.department ?? "N/A"}
Designation: ${user?.designation ?? "N/A"}
Join Date: ${user?.joinDate ? new Date(user.joinDate).toLocaleDateString("en-IN") : "N/A"}
Role: ${user?.role ?? "N/A"}

═══ LEAVE BALANCES (${currentYear}) ═══
Paid Leave:   ${remaining.Paid} days remaining  (${used.Paid} used / ${policy.annual_paid_leave} total)
Sick Leave:   ${remaining.Sick} days remaining  (${used.Sick} used / ${policy.annual_sick_leave} total)
Unpaid Leave: ${remaining.Unpaid} days remaining (${used.Unpaid} used / ${policy.annual_unpaid_leave} total)

═══ RECENT LEAVE HISTORY ═══
${recentLeaveList.length > 0 ? recentLeaveList.map((l) => `• ${l.type} leave | ${l.from} to ${l.to} | Status: ${l.status}${l.remarks ? ` | Reason: ${l.remarks}` : ""}`).join("\n") : "No leave requests yet this year."}

═══ ATTENDANCE SUMMARY (last 30 days) ═══
Present: ${attendanceSummary.present} days | Half Day: ${attendanceSummary.halfDay} days | Absent: ${attendanceSummary.absent} days
Attendance rate: ${attendanceSummary.totalDays > 0 ? ((attendanceSummary.present / attendanceSummary.totalDays) * 100).toFixed(1) : 0}%

═══ PAYROLL ═══
${payrollSummary ? `Basic: ₹${payrollSummary.basic.toLocaleString("en-IN")} | Allowances: +₹${payrollSummary.allowances.toLocaleString("en-IN")} | Deductions: -₹${payrollSummary.deductions.toLocaleString("en-IN")} | Net Take-Home: ₹${payrollSummary.net.toLocaleString("en-IN")}` : "Payroll not set up yet. Contact HR."}

═══ COMPANY LEAVE POLICY ═══
${policy.rules.map((r: string, i: number) => `${i + 1}. ${r}`).join("\n")}
• Carry-forward limit: ${policy.carry_forward_limit} days
• Advance notice for unpaid leave: ${policy.unpaid_leave_notice_days} days

═══ INSTRUCTIONS ═══
- Answer ONLY from the data above. Do not invent numbers.
- Be warm, concise, and direct (2-4 sentences max unless a detailed breakdown is needed).
- If asked about leave balance, always show remaining AND used counts.
- If you cannot answer from the data, say: "I don't have that information — please contact HR directly."`;

    // ── Stream response back ──────────────────────────────────────────────
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const responseStream = await ai.models.generateContentStream({
            model: "gemini-2.5-flash",
            contents: `${systemPrompt}\n\nEMPLOYEE QUESTION: ${question}`,
          });

          for await (const chunk of responseStream) {
            const text = chunk.text ?? "";
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
        } catch (err) {
          controller.enqueue(
            encoder.encode(`\n\nSorry, I encountered an error: ${(err as Error).message}`)
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return new Response((error as Error).message, { status: 500 });
  }
}
