import { NextResponse } from "next/server";

export const runtime = "nodejs"; // important for Vercel + fetch stability

const MODEL = "gemini-2.0-flash";

// ---- SYSTEM PROMPT (built in) ----
const SYSTEM_PROMPT = `
You are an AI labor automation analyst.

You evaluate automation exposure of tasks, NOT full job extinction.

Follow this structure strictly:

STEP 1:
Evaluate each selected task individually for automation exposure (0–10).

STEP 2:
Identify structural resistance factors:
- Physical unpredictability
- Real-time embodied decision making
- Legal liability burden
- Emotional / empathy intensity
- Environmental chaos level
- Human trust requirement

STEP 3:
Compute Base Exposure Score (average of task scores).

STEP 4:
Apply structural dampeners:
- If high physical unpredictability → cap final score at 7.
- If life-or-death legal liability → cap final score at 6.
- If heavy empathy + human trust dependency → cap final score at 6.
- If multiple structural resistances (2+ of the above) → cap final score at 5.

STEP 5:
Output JSON ONLY in this exact shape (no backticks, no commentary):

{
  "task_scores": [
    { "task": "...", "score": 0-10, "reason": "..." }
  ],
  "base_exposure": 0-10,
  "structural_resistance": "Low" | "Medium" | "High",
  "structural_factors": {
    "physical_unpredictability": true|false,
    "real_time_embodied_decision_making": true|false,
    "legal_liability_life_safety": true|false,
    "heavy_empathy_trust": true|false,
    "environmental_chaos": true|false
  },
  "dampener_applied": true|false,
  "cap_applied": 5|6|7|null,
  "final_replacement_score": 0-10,
  "explanation": "...",
  "confidence": "Low" | "Medium" | "High"
}

Be analytical and structured.
Do not exaggerate automation capability.
`;

// ---- Helpers ----
function jsonFromText(text) {
  // First try direct JSON
  try {
    return JSON.parse(text);
  } catch (_) {}

  // Try to extract first JSON object block
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const candidate = text.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch (_) {}
  }

  return null;
}

function clamp(n, min, max) {
  const num = Number(n);
  if (!Number.isFinite(num)) return min;
  return Math.max(min, Math.min(max, num));
}

function normalizeReportShape(report) {
  // Ensure required fields exist even if model forgets something
  const taskScores = Array.isArray(report?.task_scores) ? report.task_scores : [];
  const normalizedTaskScores = taskScores
    .map((t) => ({
      task: String(t?.task ?? ""),
      score: clamp(t?.score ?? 0, 0, 10),
      reason: String(t?.reason ?? ""),
    }))
    .filter((t) => t.task.length > 0);

  const base = clamp(report?.base_exposure ?? 0, 0, 10);

  const factors = report?.structural_factors ?? {};
  const structural_factors = {
    physical_unpredictability: Boolean(factors.physical_unpredictability),
    real_time_embodied_decision_making: Boolean(factors.real_time_embodied_decision_making),
    legal_liability_life_safety: Boolean(factors.legal_liability_life_safety),
    heavy_empathy_trust: Boolean(factors.heavy_empathy_trust),
    environmental_chaos: Boolean(factors.environmental_chaos),
  };

  const sr = String(report?.structural_resistance ?? "Medium");
  const structural_resistance = ["Low", "Medium", "High"].includes(sr) ? sr : "Medium";

  const dampener_applied = Boolean(report?.dampener_applied);

  const capVal = report?.cap_applied;
  const cap_applied = capVal === 5 || capVal === 6 || capVal === 7 ? capVal : null;

  const final = clamp(report?.final_replacement_score ?? base, 0, 10);

  const conf = String(report?.confidence ?? "Medium");
  const confidence = ["Low", "Medium", "High"].includes(conf) ? conf : "Medium";

  return {
    task_scores: normalizedTaskScores,
    base_exposure: base,
    structural_resistance,
    structural_factors,
    dampener_applied,
    cap_applied,
    final_replacement_score: final,
    explanation: String(report?.explanation ?? ""),
    confidence,
  };
}

// ---- Route Handlers ----
export async function POST(req) {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: "Missing GEMINI_API_KEY (or GOOGLE_API_KEY) in environment variables." },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
    }

    const jobTitle = String(body.jobTitle ?? "");
    const industry = String(body.industry ?? "");
    const seniority = String(body.seniority ?? "");
    const jobDescription = String(body.jobDescription ?? "");
    const tasks = Array.isArray(body.tasks) ? body.tasks.map(String) : [];

    if (!jobDescription || tasks.length < 3) {
      return NextResponse.json(
        { ok: false, error: "Please provide a job description and select 3–8 tasks." },
        { status: 400 }
      );
    }

    // User prompt with explicit fields
    const userPrompt = `
ROLE INPUTS:
- Job title: ${jobTitle || "(not provided)"}
- Industry: ${industry || "(not provided)"}
- Seniority: ${seniority || "(not provided)"}

JOB DESCRIPTION:
${jobDescription}

SELECTED TASKS (3–8):
${tasks.map((t, i) => `${i + 1}. ${t}`).join("\n")}

Return JSON ONLY, matching the exact schema.
`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

    const payload = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text:
                SYSTEM_PROMPT +
                "\n\n" +
                userPrompt +
                "\n\nIMPORTANT: Output must be valid JSON only. No markdown, no extra text.",
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        topP: 0.9,
        maxOutputTokens: 1200,
      },
    };

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      return NextResponse.json(
        {
          ok: false,
          error: `Gemini API error (${resp.status})`,
          details: errText.slice(0, 800),
        },
        { status: 502 }
      );
    }

    const data = await resp.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("")?.trim() || "";

    const parsed = jsonFromText(text);
    if (!parsed) {
      return NextResponse.json(
        {
          ok: false,
          error: "Gemini returned invalid JSON.",
          raw: text.slice(0, 1200),
        },
        { status: 502 }
      );
    }

    const report = normalizeReportShape(parsed);

    return NextResponse.json({
      ok: true,
      usedModel: MODEL,
      report,
      meta: {
        received: {
          jobTitle,
          industry,
          seniority,
          tasksCount: tasks.length,
          chars: jobDescription.length,
        },
      },
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "Server error", details: String(e?.message || e) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ ok: false, error: "Method Not Allowed" }, { status: 405 });
}
