import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req) {
  try {
    const body = await req.json();

    const { jobTitle, industry, seniority, description, tasks } = body;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0,
        response_mime_type: "application/json"
      }
    });

    const prompt = `
You are an AI labor economist.

Return ONLY valid JSON.
No markdown.
No commentary.
No explanation.
No extra text.

Output format:

{
  "riskLevel": "Low | Medium | High",
  "safetyScore": number,
  "timeHorizon": "1-3 years | 3-5 years | 5+ years",
  "automationExposure": number,
  "augmentationPotential": number,
  "humanMoat": number,
  "accountabilityShield": number,
  "toolchainReplaceability": number,
  "adoptionSpeed": number,
  "summary": "short explanation"
}

Job Title: ${jobTitle}
Industry: ${industry}
Seniority: ${seniority}

Job Description:
${description}

Selected Tasks:
${tasks.join(", ")}
`;

    const result = await model.generateContent(prompt);

    const text = result.response.text();

    let parsed;

    try {
      parsed = JSON.parse(text);
    } catch (err) {
      return new Response(
        JSON.stringify({
          error: "Model returned invalid JSON.",
          raw: text
        }),
        { status: 500 }
      );
    }

    return new Response(JSON.stringify(parsed), { status: 200 });

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
}
