import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs"; // important for Vercel

export async function POST(req) {
  try {
    // Parse request body
    const {
      jobTitle,
      industry,
      seniority,
      jobDescription,
      tasks
    } = await req.json();

    // Validate API key
    if (!process.env.GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing GEMINI_API_KEY environment variable." }),
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // ✅ Use stable, supported model
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash"
    });

    const prompt = `
You are an AI career displacement risk analyst.

Return ONLY valid JSON.

Analyze the following role:

Job Title: ${jobTitle}
Industry: ${industry}
Seniority: ${seniority}

Job Description:
${jobDescription}

Selected Tasks:
${Array.isArray(tasks) ? tasks.join(", ") : ""}

Return JSON in this exact format:

{
  "riskLevel": "Low | Moderate | High",
  "safetyScore": number (0-100),
  "automationExposure": number (0-100),
  "augmentationPotential": number (0-100),
  "humanMoat": number (0-100),
  "accountabilityShield": number (0-100),
  "toolchainReplaceability": number (0-100),
  "adoptionSpeed": number (0-1),
  "summary": "short explanation"
}
`;

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ]
    });

    const rawText = result.response.text();

    // Attempt to safely parse JSON
    let parsed;

    try {
      parsed = JSON.parse(rawText);
    } catch (err) {
      return new Response(
        JSON.stringify({
          error: "Model did not return valid JSON.",
          raw: rawText
        }),
        { status: 500 }
      );
    }

    return new Response(JSON.stringify(parsed), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message
      }),
      { status: 500 }
    );
  }
}
