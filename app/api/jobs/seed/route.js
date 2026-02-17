// app/api/jobs/seed/route.js
import client from "../../../../lib/opensearch";
import { scoreResilience } from "../../../jobs/jobScoring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INDEX = "jobs_v1";

async function ensureIndex() {
  const existsResp = await client.indices.exists({ index: INDEX });
  const exists = existsResp?.body ?? existsResp;

  if (exists) return;

  await client.indices.create({
    index: INDEX,
    body: {
      settings: {
        index: { number_of_shards: 1, number_of_replicas: 0 },
      },
      mappings: {
        properties: {
          title: { type: "text" },
          company: { type: "keyword" },
          location: { type: "keyword" },
          description: { type: "text" },
          url: { type: "keyword" },
          posted_ts: { type: "date" },

          resilience_score: { type: "integer" },
          resilience_reason: { type: "keyword" },
          score_version: { type: "keyword" },

          compression_stability: { type: "float" },
          employer_ai_risk: { type: "float" },
        },
      },
    },
  });
}

function seededJob(i) {
  const roles = [
    "Financial Analyst",
    "Nurse",
    "Teacher",
    "Accountant",
    "Software Engineer",
    "Electrician",
    "Pharmacist",
    "Dentist",
    "Product Manager",
    "Sales Executive",
    "Operations Analyst",
  ];
  const companies = ["NorthBridge", "Cedar Health", "HarborTech", "Crown Dental", "Atlas Group", "Sunrise Labs"];
  const cities = ["New York, NY", "Austin, TX", "San Jose, CA", "Chicago, IL", "Miami, FL", "Denver, CO"];

  const title = roles[i % roles.length];
  const company = companies[i % companies.length];
  const location = cities[i % cities.length];

  const description = `Role: ${title}. Company: ${company}. Location: ${location}. Responsibilities include analysis, coordination, documentation, tools usage, stakeholder communication, and hands-on execution depending on role.`;

  const attrs = {
    embodiment: /nurse|dentist|electrician|pharmacist/i.test(title) ? 0.75 : 0.25,
    liability: /nurse|dentist|pharmacist|accountant/i.test(title) ? 0.65 : 0.30,
    regulatory: /pharmacist|dentist|accountant/i.test(title) ? 0.60 : 0.25,
    autonomy: /manager|executive|product/i.test(title) ? 0.65 : 0.35,
    revenueProximity: /sales/i.test(title) ? 0.70 : 0.35,
    trustDepth: /teacher|nurse|dentist/i.test(title) ? 0.60 : 0.30,
    repeatability: /analyst|accountant/i.test(title) ? 0.65 : 0.35,
    toolAutomation: /engineer|analyst|accountant/i.test(title) ? 0.55 : 0.30,
  };

  const scored = scoreResilience(attrs);

  return {
    id: `seed_${i}_${Date.now()}`,
    title,
    company,
    location,
    description,
    url: "",
    posted_ts: Date.now(),

    resilience_score: scored.score,
    resilience_reason: scored.reason,
    score_version: scored.scoreVersion,

    compression_stability: 0.7,
    employer_ai_risk: 0.4,
  };
}

export async function GET(req) {
  try {
    await ensureIndex();

    const { searchParams } = new URL(req.url);
    const n = Math.min(Number(searchParams.get("n") || 5000), 10000);

    const body = [];
    for (let i = 0; i < n; i++) {
      const job = seededJob(i);
      body.push({ index: { _index: INDEX, _id: job.id } });
      body.push(job);
    }

    const resp = await client.bulk({ body, refresh: true });
    const out = resp?.body || resp;

    return Response.json({
      ok: true,
      indexed: n,
      errors: Boolean(out?.errors),
    });
  } catch (e) {
    return Response.json(
      { ok: false, error: e?.message || "Seed failed" },
      { status: 200 }
    );
  }
}
