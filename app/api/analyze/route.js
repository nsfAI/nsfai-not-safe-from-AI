import { GoogleGenAI } from "@google/genai";

export async function POST(req) {
  try {
    const body = await req.json();
    const { jobTitle, industry, seniority, description, tasks } = body;

    if (!process.env.GOOGLE_API_KEY) {
      return Response.json(
        { error: "Missing GOOGLE_API_KEY in environment variables." },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GOOGLE_API_KEY,
    });

    const prompt = `
You are an AI displacement risk analyst.

Analyze this job and provide:

1. AI automation risk score (0-100%)
2. Why it is vulnerable or protected
3. Most automatable tasks
4. Hardest tasks to automate
5. 5-year outlook

Job Title: ${jobTitle}
Industry: ${industry}
Seniority: ${seniority}

Description:
${description}

Tasks:
${tasks?.join(", ")}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });

    return Response.json({
      result: response.text,
    });

  } catch (error) {
    console.error("GENAI ERROR:", error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
