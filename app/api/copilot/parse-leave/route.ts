import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { generateStructured } from "@/lib/gemini";

interface ParsedLeave {
  leaveType: "Paid" | "Sick" | "Unpaid" | null;
  startDate: string | null;
  endDate: string | null;
  remarks: string;
  confidence: {
    leaveType: boolean;
    startDate: boolean;
    endDate: boolean;
    remarks: boolean;
  };
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("hrms_token")?.value;
    const decoded = token ? verifyToken(token) : null;
    if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { message } = await request.json();
    if (!message) return NextResponse.json({ error: "message is required" }, { status: 400 });

    const today = new Date().toISOString().split("T")[0];

    const prompt = `Today's date is ${today}.
    
A user said: "${message}"

Extract the leave request details from this message. Resolve relative dates (like "next Monday", "tomorrow") based on today's date (${today}).

If a duration is specified (e.g., "2 days", "3 days") without an explicit start date:
- Assume the startDate is today (${today}).
- Calculate the endDate correctly so that the total days equals the requested duration. For example, a 1-day leave starting today has startDate = today and endDate = today. A 2-day leave starting today has startDate = today and endDate = today + 1 day (i.e. ${today} and ${today} + 1 day).

Return a JSON object with:
- leaveType: one of "Paid", "Sick", "Unpaid", or null if unclear
- startDate: "YYYY-MM-DD" format or null if unclear  
- endDate: "YYYY-MM-DD" format or null if unclear (same as startDate if single day)
- remarks: a professional descriptive reason, e.g. "Personal vacation time request" or "Annual leave request" rather than a single word like "Vacation".
- confidence: object with boolean fields for each key above (true = you're confident, false = you're guessing)

This route ONLY extracts data. It does NOT create any leave request.`;

    const schemaDescription = `{
  "leaveType": "Paid" | "Sick" | "Unpaid" | null,
  "startDate": "YYYY-MM-DD" | null,
  "endDate": "YYYY-MM-DD" | null,
  "remarks": "string",
  "confidence": {
    "leaveType": boolean,
    "startDate": boolean,
    "endDate": boolean,
    "remarks": boolean
  }
}`;

    const result = await generateStructured<ParsedLeave>(prompt, schemaDescription);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
