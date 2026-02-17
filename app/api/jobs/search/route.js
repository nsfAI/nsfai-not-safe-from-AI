// app/api/jobs/search/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import client from "../../../../lib/opensearch";

const INDEX = "jobs_v1";

// Query-time synonyms (small + safe). You do NOT need 5000 occupations here.
// With fuzziness + prefix + seeded titles, you’ll match most terms.
function expandQuery(q) {
  const raw = String(q || "").trim();
  if (!raw) return { raw: "", expanded: [] };

  const lower = raw.toLowerCase();

  const expansions = {
    finance: ["financial", "financing", "fp&a", "accounting", "analyst"],
    financial: ["finance", "fp&a", "analyst"],
    accounting: ["accountant", "cpa", "audit", "bookkeeper", "controller"],
    accountant: ["accounting", "cpa", "audit", "bookkeeper", "controller"],
    nurse: ["nursing", "rn", "bsn", "lpn"],
    nursing: ["nurse", "rn", "bsn", "lpn"],
    doctor: ["physician", "medicine", "md", "clinical"],
    dentist: ["dental", "dds", "dmd"],
    pharmacist: ["pharmacy", "pharmd"],
    software: ["developer", "programmer", "engineer", "swe"],
    developer: ["software", "programmer", "engineer", "swe"],
    programmer: ["software", "developer", "engineer"],
    engineer: ["engineering", "developer", "software"],
    teacher: ["education", "instructor", "school"],
    sales: ["account executive", "bd", "business development", "revenue"],
    marketing: ["growth", "brand", "content", "performance marketing"],
    legal: ["attorney", "lawyer", "paralegal", "compliance"],
    realestate: ["real estate", "realtor", "property", "leasing"],
    banking: ["bank", "finance", "credit", "loan"],
  };

  const tokens = lower.split(/\s+/g).filter(Boolean);
  const expandedSet = new Set();

  for (const t of tokens) {
    const hits = expansions[t];
    if (hits) hits.forEach((x) => expandedSet.add(x));
  }

  // handle common multi token
  const collapsed = lower.replace(/\s+/g, "");
  if (expansions[collapsed]) expansions[collapsed].forEach((x) => expandedSet.add(x));
  if (expansions[lower]) expansions[lower].forEach((x) => expandedSet.add(x));

  return { raw, expanded: Array.from(expandedSet).slice(0, 12) };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const q = searchParams.get("q") || "";
    const limit = Math.min(Number(searchParams.get("limit") || 25), 50);
    const scenario = searchParams.get("scenario") || "moderate";

    const { raw, expanded } = expandQuery(q);
    const hasQuery = raw.trim().length > 0;

    // scenario multiplier on resilience weight
    const scenarioWeight =
      scenario === "aggressive" ? 1.15 : scenario === "conservative" ? 0.9 : 1.0;

    const should = [];

    if (hasQuery) {
      // fuzzy relevance
      should.push({
        multi_match: {
          query: raw,
          fields: ["title^6", "company^2", "location^2", "description"],
          type: "best_fields",
          operator: "or",
          fuzziness: "AUTO",
          prefix_length: 1,
          max_expansions: 50,
        },
      });

      // prefix-ish behavior (finance -> financi*)
      should.push({
        multi_match: {
          query: raw,
          fields: ["title^6", "company^2", "location^2", "description"],
          type: "bool_prefix",
        },
      });

      // expansions
      for (const e of expanded) {
        should.push({
          multi_match: {
            query: e,
            fields: ["title^6", "company^2", "location^2", "description"],
            type: "best_fields",
            operator: "or",
          },
        });
      }
    }

    // IMPORTANT: No script_score (hosted providers often block it).
    // We approximate employer_ai_risk penalty with tiers:
    // low risk boost, medium neutral, high risk penalty
    const functions = [
      {
        field_value_factor: {
          field: "resilience_score",
          factor: 0.06 * scenarioWeight,
          missing: 0,
        },
      },
      {
        field_value_factor: {
          field: "compression_stability",
          factor: 0.8,
          missing: 0,
        },
      },
      // employer_ai_risk tiers
      { filter: { range: { employer_ai_risk: { lte: 0.25 } } }, weight: 1.12 },
      { filter: { range: { employer_ai_risk: { gt: 0.25, lte: 0.6 } } }, weight: 1.0 },
      { filter: { range: { employer_ai_risk: { gt: 0.6 } } }, weight: 0.82 },
    ];

    const body = {
      size: limit,
      track_total_hits: true,
      query: hasQuery
        ? {
            function_score: {
              query: { bool: { should, minimum_should_match: 1 } },
              functions,
              score_mode: "sum",
              boost_mode: "multiply",
            },
          }
        : {
            // empty search => “browse” view
            match_all: {},
          },
      sort: hasQuery
        ? ["_score"]
        : [{ resilience_score: "desc" }, { posted_ts: "desc" }],
    };

    const resp = await client.search({ index: INDEX, body });

    const hits = resp?.body?.hits?.hits || [];
    const total = resp?.body?.hits?.total?.value ?? hits.length;

    const results = hits.map((h) => {
      const src = h?._source || {};
      return {
        id: h?._id,
        title: src.title ?? null,
        company: src.company ?? null,
        location: src.location ?? null,
        description: src.description ?? null,
        url: src.url ?? null,
        posted_ts: src.posted_ts ?? null,
        resilience_score: src.resilience_score ?? 0,
        resilience_reason: src.resilience_reason ?? "Resilience signal pending.",
        score_version: src.score_version ?? "v1",
        compression_stability: src.compression_stability ?? 0,
        employer_ai_risk: src.employer_ai_risk ?? 0,
      };
    });

    return Response.json({
      ok: true,
      query: raw,
      expanded,
      scenario,
      total,
      results,
    });
  } catch (e) {
    return Response.json(
      {
        ok: false,
        error: e?.message || "Search failed",
        hint:
          "If this is production, confirm OPENSEARCH_URL is set on Vercel and your index exists (jobs_v1).",
      },
      { status: 200 }
    );
  }
}
