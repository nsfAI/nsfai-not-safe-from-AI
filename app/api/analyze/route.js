export const runtime = "nodejs";

function requiredEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} environment variable.`);
  return v;
}

function clamp(n, min, max) {
  const x = Number(n);
  if (Number.isNaN(x)) return min;
  return Math.max(min, Math.min(max, x));
}

function truncate(str, maxChars) {
  const s = String(str || "");
  if (s.length <= maxChars) return s;
  return s.slice(0, maxChars) + "\n\n[TRUNCATED]";
}

async function geminiJson({ prompt, temperature = 0.2 }) {
  const apiKey = requiredEnv("GEMINI_API_KEY");

  // Prefer a fast model by default for reliability
  const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature,
      maxOutputTokens: 900
    },
    safetySettings: [],
    tools: [{
      functionDeclarations: [{
        name: "nsfai_result",
        parameters: {
          type: "object",
          properties: {
            normalized_role: { type: "string" },
            safety_score: { type: "number" },
            overall_band: { type: "string" },
            time_horizon: { type: "string" },
            executive_summary: { type: "string" },
            breakdown: {
              type: "object",
              properties: {
                automation_exposure_pct: { type: "number" },
                augmentation_potential_pct: { type: "number" },
                human_moat_pct: { type: "number" },
                accountability_shield_pct: { type: "number" },
                toolchain_replaceability_pct: { type: "number" },
                adoption_speed_factor: { type: "number" }
              }
            },
            evidence_snippets: { type: "array", items: { type: "string" } },
            at_risk_tasks: { type: "array", items: { type: "string" } },
            defensible_tasks: { type: "array", items: { type: "string" } },
            plan_90_days: { type: "array", items: { type: "string" } },
            adjacent_roles: { type: "array", items: { type: "string" } }
          },
          required: [
            "normalized_role",
            "safety_score",
            "overall_band",
            "time_horizon",
            "executive_summary",
            "breakdown",
            "evidence_snippets",
            "at_risk_tasks",
            "defensible_tasks",
            "plan_90_days",
            "adjacent_roles"
          ]
        }
      }]
    }],
    toolConfig: { functionCallingConfig: { mode: "ANY" } }
  };

  // ✅ Increased timeout to 60 seconds
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    const data = await resp.json();
    if (!resp.ok) throw new Error(data?.error?.message || "Gemini request failed.");

    const call = data?.candidates?.[0]?.content?.parts?.find(p => p.functionCall);
    if (!call?.functionCall?.args) throw new Error("Model did not return structured JSON.");

    return call.functionCall.args;
  } catch (e) {
    if (String(e?.name) === "AbortError") {
      throw new Error("AI request timed out (60s). Try shortening the job description or selecting fewer tasks.");
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
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

    // ✅ Keep requests fast: cap JD and tasks
    const safeJD = truncate(job_description, 1200);     // was unlimited, now capped
    const safeTasks = tasks.slice(0, 8);               // cap tasks to 8 max

    const prompt = `
You are NSFAI (Career Survival Score) for early-career professionals and students.

Return structured JSON only via the tool call.

Inputs:
title: ${title || "(not provided)"}
industry: ${industry}
seniority: ${seniority}
tasks: ${JSON.stringify(safeTasks)}

Job description (may be truncated):
<<<
${safeJD}
>>>

Guidelines:
- Be concise and practical.
- evidence_snippets must be short near-quotes from the JD.
- Band rule: Low >=70, Medium 45-69, High <45.
- safety_score higher = safer.
`;

    const result = await geminiJson({ prompt });

    // Safety clamps
    result.safety_score = clamp(result.safety_score, 0, 100);

    // Normalize band if missing
    if (!result.overall_band) {
      result.overall_band =
        result.safety_score >= 70 ? "Low Risk" :
        result.safety_score >= 45 ? "Medium Risk" : "High Risk";
    }

    // Clamp breakdown
    result.breakdown = result.breakdown || {};
    result.breakdown.automation_exposure_pct = clamp(result.breakdown.automation_exposure_pct, 0, 100);
    result.breakdown.augmentation_potential_pct = clamp(result.breakdown.augmentation_potential_pct, 0, 100);
    result.breakdown.human_moat_pct = clamp(result.breakdown.human_moat_pct, 0, 100);
    result.breakdown.accountability_shield_pct = clamp(result.breakdown.accountability_shield_pct, 0, 100);
    result.breakdown.toolchain_replaceability_pct = clamp(result.breakdown.toolchain_replaceability_pct, 0, 100);
    result.breakdown.adoption_speed_factor = clamp(result.breakdown.adoption_speed_factor, 1, 5);

    return Response.json(result);
  } catch (e) {
    return Response.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
