import { GoogleGenAI } from "@google/genai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not set in environment variables.");
}

// Single shared client — initialized once per cold start
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const MODEL = "gemini-2.5-flash"; // Recommended default: fast, smart, multimodal

/**
 * Generates a structured JSON response from Gemini.
 * Instructs the model to return ONLY valid JSON — no markdown fences, no preamble.
 * Throws a clear error if JSON.parse fails so callers can handle it gracefully.
 */
export async function generateStructured<T>(
  prompt: string,
  schemaDescription: string
): Promise<T> {
  const systemInstruction = `You are a precise data extraction assistant.
Return ONLY valid JSON that matches this schema: ${schemaDescription}
Do NOT include markdown code fences, explanations, or any text outside the JSON object.`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: `${systemInstruction}\n\n${prompt}`,
  });

  const text = (response.text ?? "").trim();

  // Strip any accidental markdown fences the model may still produce
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error(`Gemini returned invalid JSON: ${cleaned}`);
  }
}

/**
 * Calls Gemini for a plain-text answer (HR assistant, Q&A, etc.)
 */
export async function generateText(prompt: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
  });
  return (response.text ?? "").trim();
}

/**
 * Streams a Gemini response — useful for real-time typing effects in the UI.
 */
export async function generateTextStream(
  prompt: string,
  onChunk: (chunk: string) => void
): Promise<void> {
  const responseStream = await ai.models.generateContentStream({
    model: MODEL,
    contents: prompt,
  });

  for await (const chunk of responseStream) {
    if (chunk.text) onChunk(chunk.text);
  }
}
