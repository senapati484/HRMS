import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import { Leave } from "@/models/Leave";
import { generateText } from "@/lib/gemini";
import policy from "@/lib/policy.json";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("hrms_token")?.value;
    const decoded = token ? verifyToken(token) : null;
    if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { question } = await request.json();
    if (!question) return NextResponse.json({ error: "question is required" }, { status: 400 });

    await connectDB();

    // Compute real remaining balances from DB
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(`${currentYear}-01-01`);
    const endOfYear = new Date(`${currentYear}-12-31`);

    const approvedLeaves = await Leave.find({
      userId: decoded.userId,
      status: "Approved",
      startDate: { $gte: startOfYear, $lte: endOfYear },
    }).lean();

    const used = { Paid: 0, Sick: 0, Unpaid: 0 };
    for (const leave of approvedLeaves) {
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      used[leave.leaveType] += days;
    }

    const remaining = {
      Paid: policy.annual_paid_leave - used.Paid,
      Sick: policy.annual_sick_leave - used.Sick,
      Unpaid: policy.annual_unpaid_leave - used.Unpaid,
    };

    const prompt = `You are an HR assistant. Answer the employee's question using ONLY the data provided below. 
If the question cannot be answered from this data, say "I don't have enough information to answer that."
Do NOT invent policy rules or data not present below.

TODAY: ${new Date().toISOString().split("T")[0]}

EMPLOYEE LEAVE BALANCES (for ${currentYear}):
- Paid Leave: ${remaining.Paid} days remaining (${used.Paid} used of ${policy.annual_paid_leave} allowed)
- Sick Leave: ${remaining.Sick} days remaining (${used.Sick} used of ${policy.annual_sick_leave} allowed)
- Unpaid Leave: ${remaining.Unpaid} days remaining (${used.Unpaid} used of ${policy.annual_unpaid_leave} allowed)

COMPANY LEAVE POLICY:
${policy.rules.map((r, i) => `${i + 1}. ${r}`).join("\n")}
- Carry-forward limit: ${policy.carry_forward_limit} days
- Advance notice for unpaid leave: ${policy.unpaid_leave_notice_days} days

EMPLOYEE QUESTION: ${question}

Provide a clear, concise, helpful answer in 1-3 sentences.`;

    const answer = await generateText(prompt);
    return NextResponse.json({ answer });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
