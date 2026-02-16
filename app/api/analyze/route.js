export const runtime = "nodejs";

function requiredEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} environment variable.`);
  return v;
}

async function geminiJson({ prompt, temperature = 0.2 }) {
  const apiKey = requiredEnv("GEMINI_API_KEY");
  const model = process.env.GEMINI_MODEL || "gemini-flash-latest";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature,
      responseMimeType: "application/json",
      maxOutputTokens: 800
    }
  };

  // Hard timeout so "Analyzing..." never hangs forever
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 20000); // 20 seconds

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    const data = await resp.json();
    if (!resp.ok) throw new Error(data?.error?.message || "Gemini request failed.");

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("No model output received.");

    // --- Robust JSON extraction (fixes your current error) ---
    let cleaned = String(text).trim();

    // Remove markdown fences if present
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/```json/g, "").replace(/```/g, "").trim();
    }

    // Extract first JSON object in case model adds extra text
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }

    return JSON.parse(cleaned);
  } catch (e) {
    if (String(e?.name) === "AbortError") {
      throw new Error("AI request timed out. Please try again in 30–60 seconds.");
    }
    throw e;
  } finally {
    clearTimeout(t);
  }
}

function clamp(n, min, max) {
  const x = Number(n);
  if (Number.isNaN(x)) return min;
  return Math.max(min, Math.min(max, x));
}

export async function POST(req) {
  try {
    const { title, industry, seniority, job_description, tasks } = await req.json();

    if (!job_description || String(job_description).trim().length < 300) {
      return Response.json({ error: "Paste a job description (300+ characters)." }, { status: 400 });
    }
    if (!Array.isArray(tasks) || tasks.length < 3) {
      return Response.json({ error: "Select at least 3 tasks you actually do." }, { status: 400 });
    }

    const prompt = `
You are NSFAI (Not Safe From AI), an advanced job risk scoring engine.

Return ONLY valid JSON. No markdown. No extra text.

Inputs:
title: ${title || "(not provided)"}
industry: ${industry}
seniority: ${seniority}
self_reported_tasks: ${JSON.stringify(tasks)}

Job description:
<<<
${job_description}
>>>

Output JSON EXACTLY with this schema:
{
  "normalized_role": "string",
  "safety_score": 0-100,
  "overall_band": "Low Risk" | "Medium Risk" | "High Risk",
  "time_horizon": "string",
  "executive_summary": "string",
  "breakdown": {
    "automation_exposure_pct": 0-100,
    "augmentation_potential_pct": 0-100,
    "human_moat_pct": 0-100,
    "accountability_shield_pct": 0-100,
    "toolchain_replaceability_pct": 0-100,
    "adoption_speed_factor": 1-5
  },
  "evidence_snippets": ["string","string","string","string","string","string"],
  "at_risk_tasks": ["string","... up to 10"],
  "defensible_tasks": ["string","... up to 10"],
  "plan_90_days": ["string","... up to 10"],
  "adjacent_roles": ["string","... up to 10"]
}

Rules:
- evidence_snippets must be short quotes/near-quotes from the JD (max ~20 words each).
- Be non-alarmist and practical.
- Keep items concise.
- safety_score higher = safer.
- Band rule: Low >=70, Medium 45-69, High <45.
`;

    const out = await geminiJson({ prompt, temperature: 0.2 });

    // Guardrails so UI doesn't break if the model returns weird values
    out.safety_score = clamp(out.safety_score, 0, 100);
    const computedBand = out.safety_score >= 70 ? "Low Risk" : out.safety_score >= 45 ? "Medium Risk" : "High Risk";
    out.overall_band = out.overall_band || computedBand;

    out.breakdown = out.breakdown || {};
    out.breakdown.automation_exposure_pct = clamp(out.breakdown.automation_exposure_pct, 0, 100);
    out.breakdown.augmentation_potential_pct = clamp(out.breakdown.augmentation_potential_pct, 0, 100);
    out.breakdown.human_moat_pct = clamp(out.breakdown.human_moat_pct, 0, 100);
    out.breakdown.accountability_shield_pct = clamp(out.breakdown.accountability_shield_pct, 0, 100);
    out.breakdown.toolchain_replaceability_pct = clamp(out.breakdown.toolchain_replaceability_pct, 0, 100);
    out.breakdown.adoption_speed_factor = clamp(out.breakdown.adoption_speed_factor, 1, 5);

    return Response.json(out);
  } catch (e) {
    const msg = e?.message || "Server error";
    const status = msg.includes("timed out") ? 504 : 500;
    return Response.json({ error: msg }, { status });
  }
}
