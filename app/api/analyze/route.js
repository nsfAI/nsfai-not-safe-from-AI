import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(req) {
  try {
    const body = await req.json();
    const { jobTitle, industry, seniority, description, tasks } = body;

    const ai = new GoogleGenAI({
      apiKey: process.env.GOOGLE_API_KEY,
    });

    const prompt = `
You are NSFAI™, an AI workforce risk intelligence engine.

Return ONLY valid JSON.
Do not include markdown.
Do not include commentary.

Structure exactly as:

{
  "riskScore": number (0-100),
  "riskLevel": "Low" | "Moderate" | "High" | "Critical",
  "timeline": "0-2 years" | "2-4 years" | "4-6 years" | "6+ years",
  "confidence": number (0-100),
  "automationExposure": number (0-100),
  "humanMoat": number (0-100),
  "augmentationPotential": number (0-100),
  "taskBreakdown": [
    { "task": string, "risk": number }
  ],
  "riskDrivers": [string],
  "protectionFactors": [string],
  "futureProofSkills": [string]
}

Job Title: ${jobTitle}
Industry: ${industry}
Seniority: ${seniority}

Job Description:
${description}

Primary Tasks:
${tasks?.join(", ")}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        temperature: 0.3,
        maxOutputTokens: 800
      }
    });

    const raw = response.text;

    let parsed;

    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      return NextResponse.json(
        { error: "Model did not return structured JSON.", raw },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);

  } catch (error) {
    if (error.status === 429) {
      return NextResponse.json(
        { error: "Rate limit hit. Please try again shortly." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
