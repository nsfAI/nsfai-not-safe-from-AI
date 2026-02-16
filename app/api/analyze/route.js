import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs"; // IMPORTANT: genai SDK needs Node runtime (not Edge)

export async function POST(req) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing GEMINI_API_KEY in environment variables." },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const { jobTitle = "", industry = "", seniority = "", jobDescription = "", tasks = [] } = body;

    if (!jobDescription || String(jobDescription).trim().length < 30) {
      return NextResponse.json(
        { error: "Job description is required (min ~30 characters)." },
        { status: 400 }
      );
    }

    const safeTasks = Array.isArray(tasks) ? tasks.slice(0, 8).map(String) : [];

    const prompt = `
You are NSF-AI (Not Safe From AI). Analyze the AI displacement risk for this role.
Return STRICT JSON ONLY (no markdown, no extra text). Schema:

{
  "overall_risk_score": 0-100,
  "risk_level": "Low" | "Moderate" | "High" | "Very High",
  "top_risk_drivers": [string, ...],
  "most_automatable_tasks": [string, ...],
  "most_human_tasks": [string, ...],
  "ai_tools_that_replace_parts": [string, ...],
  "how_to_become_ai_proof": [string, ...],
  "90_day_plan": [string, ...],
  "notes": string
}

Context:
Job Title: ${jobTitle}
Industry: ${industry}
Seniority: ${seniority}
Tasks Selected: ${safeTasks.join(", ")}

Job Description:
${jobDescription}
`.trim();

    const ai = new GoogleGenAI({ apiKey });

    // Use a safe default model name.
    // If your key is standard Gemini API (not Vertex), this should work:
    const model = "gemini-2.0-flash";

    const result = await ai.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const text = result?.text ?? "";

    // Try to parse JSON strictly; if model adds text, extract JSON block
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      const firstBrace = text.indexOf("{");
      const lastBrace = text.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const maybeJson = text.slice(firstBrace, lastBrace + 1);
        json = JSON.parse(maybeJson);
      } else {
        return NextResponse.json(
          { error: "Model did not return valid JSON.", raw: text },
          { status: 502 }
        );
      }
    }

    return NextResponse.json(json, { status: 200 });
  } catch (err) {
    const msg = String(err?.message || err);

    // Common Gemini errors
    if (msg.includes("429") || msg.toLowerCase().includes("resource exhausted")) {
      return NextResponse.json(
        { error: "Rate limit hit. Try again in ~30–60 seconds." },
        { status: 429 }
      );
    }

    if (msg.toLowerCase().includes("api key not valid")) {
      return NextResponse.json(
        { error: "API key invalid. Check GEMINI_API_KEY on Vercel." },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Server error", details: msg },
      { status: 500 }
    );
  }
}
