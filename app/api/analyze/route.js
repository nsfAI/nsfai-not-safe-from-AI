import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req) {
  try {
    const body = await req.json();
    const { jobTitle, industry, seniority, jobDescription, tasks } = body;

    if (!jobDescription) {
      return Response.json(
        { error: "Job description is required." },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
    });

    const prompt = `
Analyze AI displacement risk.

Title: ${jobTitle || "N/A"}
Industry: ${industry || "N/A"}
Seniority: ${seniority || "N/A"}

Key Tasks:
${tasks?.join(", ") || "Not specified"}

Job Description:
${jobDescription}

Return ONLY valid JSON:
{
  "riskScore": number (0-100),
  "automationLikelihood": "Low | Medium | High",
  "reasoning": "short explanation",
  "resilienceFactors": ["factor1", "factor2"],
  "vulnerableAreas": ["area1", "area2"]
}
`;

    async function generateWithRetry(retries = 2) {
      try {
        return await model.generateContent(prompt);
      } catch (err) {
        if (
          err.message?.includes("429") ||
          err.message?.includes("RESOURCE_EXHAUSTED")
        ) {
          if (retries > 0) {
            await new Promise((res) => setTimeout(res, 1500));
            return generateWithRetry(retries - 1);
          }
          return Response.json(
            { error: "Rate limit hit. Please try again shortly." },
            { status: 429 }
          );
        }
        throw err;
      }
    }

    const result = await generateWithRetry();

    const text = result.response.text();

    return Response.json({ report: text });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}
