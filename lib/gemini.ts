import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

/**
 * Calls Gemini Flash and returns a parsed JSON object matching the given schema.
 * The model is instructed to return ONLY valid JSON — no markdown fences, no preamble.
 * Throws a clear error if JSON.parse fails so callers can handle it gracefully.
 */
export async function generateStructured<T>(
  prompt: string,
  schemaDescription: string
): Promise<T> {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const systemInstruction = `You are a precise data extraction assistant. 
Return ONLY valid JSON that matches this schema: ${schemaDescription}
Do NOT include markdown code fences, explanations, or any text outside the JSON object.`;

  const result = await model.generateContent([systemInstruction, prompt]);
  const text = result.response.text().trim();

  // Strip any accidental markdown fences the model may still produce
  const cleaned = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "").trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error(`Gemini returned invalid JSON: ${cleaned}`);
  }
}

/**
 * Calls Gemini Flash for a plain-text answer (no structured output).
 */
export async function generateText(prompt: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}
