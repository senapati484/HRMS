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

    const todayDate = new Date();
    const today = todayDate.toISOString().split("T")[0];
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayOfWeek = days[todayDate.getDay()];

    const prompt = `Today's date is ${today} (which is a ${dayOfWeek}).
    
A user said: "${message}"

Extract the leave request details from this message. Resolve relative dates (like "next Monday", "tomorrow", "next week", "next two days") based on today's date (${today}).

For explicit start dates specified in the query (like "next Monday", "tomorrow", "on July 10th", etc.):
- Resolve them exactly relative to today's date (${today}). For example, if today is Saturday, July 4th, "next Monday" is Monday, July 6th. "Tomorrow" relative to Saturday, July 4th is Sunday, July 5th.
- End date should cover the requested duration starting from that resolved start date.

For relative durations like "next N days", "next N day vacation", or "next two day vacation" without a specific start day (e.g., "next two day vacation"):
- Start date is the next working day (Monday-Friday) after today. If today is Saturday or Sunday, the next working day is the following Monday. If today is Friday, the next working day is the following Monday. If today is Monday-Thursday, the next working day is tomorrow.
- End date should cover N working days.

For absolute durations like "N days leave" or "N day vacation" without "next":
- Start date is today (if today is a working day) or the next working day (if today is a weekend).
- End date should cover N working days.

For remarks:
- Provide a professional, detailed explanation of the leave based on the message. Do NOT just say "Vacation" or "Sick". Include the reason if provided (e.g., "Sick leave due to fever" or "Personal vacation time request"). If no specific reason is given, generate a professional description like "Personal time off request".

Return a JSON object with:
- leaveType: one of "Paid", "Sick", "Unpaid", or null if unclear
- startDate: "YYYY-MM-DD" format or null if unclear  
- endDate: "YYYY-MM-DD" format or null if unclear
- remarks: a detailed, professional reason (never just "vacation" or "sick")
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
