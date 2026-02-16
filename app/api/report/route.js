import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => null);

    const jobTitle = (body?.jobTitle || "").toString();
    const industry = (body?.industry || "").toString();
    const seniority = (body?.seniority || "").toString();
    const jobDesc = (body?.jobDesc || "").toString();
    const tasks = Array.isArray(body?.tasks) ? body.tasks : [];

    if (!jobDesc.trim()) {
      return NextResponse.json({ error: "Job description is required." }, { status: 400 });
    }
    if (tasks.length < 3 || tasks.length > 8) {
      return NextResponse.json({ error: "Select between 3 and 8 tasks." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing GEMINI_API_KEY in environment variables." },
        { status: 500 }
      );
    }

    // Force JSON-only output
    const prompt = `
Return ONLY valid JSON (no markdown, no extra text).
Assess AI displacement risk using the job description + selected tasks.

Output JSON with this exact shape:
{
  "risk_score": number,
  "risk_band": "Low" | "Medium" | "High",
  "why": [string, string, string],
  "most_automatable": [{"task": string, "reason": string, "time_horizon": "0-12m"|"1-3y"|"3-5y"}],
  "most_human_moat": [{"task": string, "reason": string}],
  "recommendations": [string, string, string, string, string],
  "assumptions": [string, string]
}

Role:
- jobTitle: ${jobTitle || "(not provided)"}
- industry: ${industry || "(not provided)"}
- seniority: ${seniority || "(not provided)"}

Job description:
${jobDesc}

Selected tasks:
${tasks.map((t) => `- ${t}`).join("\n")}
`.trim();

    const genAI = new GoogleGenerativeAI(apiKey);

    // ✅ Use the model you said: gemini-2.0-flash
    // Include fallbacks in case your key/account doesn't have access
    const modelOrder = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"];

    let rawText = null;
    let usedModel = null;
    let lastErr = null;

    for (const modelName of modelOrder) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 1200 },
        });

        rawText = result?.response?.text?.() ?? null;
        usedModel = modelName;
        if (rawText) break;
      } catch (e) {
        lastErr = e;
      }
    }

    if (!rawText) {
      return NextResponse.json(
        {
          error: "Gemini failed to generate a response (model access / key issue).",
          details: lastErr?.message || String(lastErr),
        },
        { status: 502 }
      );
    }

    let report = null;
    try {
      report = JSON.parse(rawText);
    } catch {
      return NextResponse.json(
        {
          error: "Gemini returned invalid JSON.",
          usedModel,
          rawModelText: rawText,
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        usedModel,
        input: { jobTitle, industry, seniority, tasksCount: tasks.length },
        report,
      },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}
