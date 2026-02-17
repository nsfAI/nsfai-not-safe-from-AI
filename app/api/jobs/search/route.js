// app/api/jobs/search/route.js
import client from "../../../../lib/opensearch";

export const dynamic = "force-dynamic";

const INDEX = "jobs_v1";

// Small query expansion map (query-time synonyms, no reindex needed)
function expandQuery(q) {
  const raw = String(q || "").trim();
  if (!raw) return { raw: "", expanded: [] };

  const lower = raw.toLowerCase();

  // Add/extend over time based on what users type
  const expansions = {
    finance: ["financial", "financing", "fp&a", "accounting", "analyst", "banking"],
    financial: ["finance", "fp&a", "analyst", "accounting"],
    accounting: ["accountant", "cpa", "audit", "bookkeeper", "controller", "tax"],
    accountant: ["accounting", "cpa", "audit", "bookkeeper", "controller", "tax"],

    nurse: ["nursing", "rn", "bsn", "lpn"],
    nursing: ["nurse", "rn", "bsn", "lpn"],
    doctor: ["physician", "medicine", "md", "clinical"],
    dentist: ["dental", "dds", "dmd"],
    pharmacist: ["pharmacy", "pharmd"],

    software: ["developer", "programmer", "engineer", "swe"],
    developer: ["software", "programmer", "engineer", "swe"],
    programmer: ["software", "developer", "engineer"],
    engineer: ["engineering", "developer", "software", "swe"],

    banking: ["bank", "finance", "credit", "loan"],
    real: ["real estate", "realtor", "property"],
    teacher: ["education", "instructor", "school"],
  };

  const tokens = lower.split(/\s+/g).filter(Boolean);
  const expandedSet = new Set();

  for (const t of tokens) {
    const hits = expansions[t];
    if (hits) hits.forEach((x) => expandedSet.add(x));
  }

  if (expansions[lower]) expansions[lower].forEach((x) => expandedSet.add(x));

  // Keep it tight
  return { raw, expanded: Array.from(expandedSet).slice(0, 12) };
}

function safeNum(n, fallback = 0) {
  const x = Number(n);
  return Number.isFinite(x) ? x : fallback;
}

export async function GET(request) {
  // ✅ Vercel safety: don’t crash prod if OPENSEARCH_URL isn’t configured
  if (!process.env.OPENSEARCH_URL && process.env.VERCEL) {
    return Response.json(
      {
        ok: false,
        error:
          "Jobs search is not configured in production yet (missing OPENSEARCH_URL). It works locally with Docker OpenSearch.",
      },
      { status: 200 }
    );
  }

  const { searchParams } = new URL(request.url);

  const q = searchParams.get("q") || "";
  const limit = Math.min(Number(searchParams.get("limit") || 25), 50);
  const scenario = searchParams.get("scenario") || "moderate";

  const { raw, expanded } = expandQuery(q);
  const hasQuery = raw.trim().length > 0;

  // Scenario weight (simple V1)
  const scenarioWeight =
    scenario === "aggressive" ? 1.15 : scenario === "conservative" ? 0.9 : 1.0;

  const should = [];

  if (hasQuery) {
    // 1) Best-fields fuzzy match (handles typos)
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

    // 2) Prefix behavior (finance -> financi*)
    should.push({
      multi_match: {
        query: raw,
        fields: ["title^6", "company^2", "location^2", "description"],
        type: "bool_prefix",
      },
    });

    // 3) Expanded synonyms (accountant -> accounting, cpa, audit...)
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

  const body = {
    size: limit,
    track_total_hits: true,
    query: hasQuery
      ? {
          function_score: {
            query: {
              bool: {
                should,
                minimum_should_match: 1,
              },
            },
            // Blend text relevance with resilience signals
            functions: [
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
              {
                // penalize high employer AI risk
                script_score: {
                  script: {
                    source:
                      "double r = (doc.containsKey('employer_ai_risk') && !doc['employer_ai_risk'].empty) ? doc['employer_ai_risk'].value : 0.0; return 1.0 - Math.min(0.85, r);",
                  },
                },
              },
            ],
            score_mode: "sum",
            boost_mode: "multiply",
          },
        }
      : {
          match_all: {},
        },
    sort: hasQuery
      ? ["_score"]
      : [{ resilience_score: "desc" }, { posted_ts: "desc" }],
  };

  const resp = await client.search({ index: INDEX, body });

  // Compatible across client versions
  const hits = resp?.body?.hits?.hits || resp?.hits?.hits || [];
  const total =
    resp?.body?.hits?.total?.value ??
    resp?.hits?.total?.value ??
    hits.length;

  // Always return flat job objects
  const results = hits.map((h) => {
    const src = h?._source || {};
    return {
      id: h?._id,
      title: src.title ?? "Untitled role",
      company: src.company ?? "Unknown company",
      location: src.location ?? "",
      description: src.description ?? "",
      url: src.url ?? "",
      posted_ts: src.posted_ts ?? null,
      resilience_score: safeNum(src.resilience_score, 0),
      resilience_reason: src.resilience_reason ?? "Resilience signal pending.",
      score_version: src.score_version ?? "v1",
      compression_stability: safeNum(src.compression_stability, 0),
      employer_ai_risk: safeNum(src.employer_ai_risk, 0),
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
}
