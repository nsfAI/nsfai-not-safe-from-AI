// app/api/jobs/ingest/route.js
import client from "../../../../lib/opensearch";
import { scoreResilience } from "../../../jobs/jobScoring";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const INDEX = "jobs_v1";

function isoOrNow(x) {
  const t = Date.parse(String(x || ""));
  return Number.isFinite(t) ? new Date(t).toISOString() : new Date().toISOString();
}

// ---------- Connectors (API-compliant ATS feeds) ----------

// Greenhouse job board JSON
async function fetchGreenhouse(board) {
  const url = `https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Greenhouse ${board} failed ${res.status}`);
  const json = await res.json();

  return (json.jobs || []).map((j) => ({
    id: `gh_${board}_${j.id}`,
    title: j.title || "",
    company: board,
    location: j.location?.name || "",
    url: j.absolute_url || "",
    description: String(j.content || "").slice(0, 50000),
    posted_ts: isoOrNow(j.updated_at || j.created_at),
  }));
}

// Lever postings
async function fetchLever(company) {
  const url = `https://api.lever.co/v0/postings/${company}?mode=json`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Lever ${company} failed ${res.status}`);
  const json = await res.json();

  return (json || []).map((j) => ({
    id: `lv_${company}_${j.id}`,
    title: j.text || "",
    company,
    location: j.categories?.location || "",
    url: j.hostedUrl || "",
    description: String(j.descriptionPlain || j.description || "").slice(0, 50000),
    posted_ts: isoOrNow(j.createdAt),
  }));
}

// ---------- Basic NLP-ish extraction (deterministic V1) ----------
function extractAttributes(job) {
  const text = `${job.title}\n${job.description}`.toLowerCase();

  const embodiment = /field|on[- ]site|patient|lab|equipment|warehouse|manufactur|clinic/.test(text)
    ? 0.75
    : 0.25;

  const liability = /license|compliance|audit|regulatory|clinical|legal|risk|hipaa|sox/.test(text)
    ? 0.65
    : 0.30;

  const regulatory = /hipaa|fda|sec|finra|sox|gdpr|regulator/.test(text)
    ? 0.75
    : 0.25;

  const autonomy = /own|lead|strategy|stakeholder|cross[- ]functional|roadmap/.test(text)
    ? 0.65
    : 0.35;

  const revenueProximity = /sales|quota|pipeline|revenue|customer|renewal|pricing/.test(text)
    ? 0.70
    : 0.35;

  const trustDepth = /client|patients|stakeholders|executive|board/.test(text)
    ? 0.60
    : 0.30;

  const repeatability = /data entry|reporting|dashboards|documentation|summariz|routine/.test(text)
    ? 0.70
    : 0.35;

  const toolAutomation = /sql|excel|powerbi|tableau|jira|docs|notion|zendesk/.test(text)
    ? 0.55
    : 0.30;

  return {
    embodiment,
    liability,
    regulatory,
    autonomy,
    revenueProximity,
    trustDepth,
    repeatability,
    toolAutomation,
  };
}

// ---------- Bulk upsert ----------
async function bulkUpsertJobs(docs) {
  if (!docs.length) return { indexed: 0, errors: false };

  const body = [];
  for (const d of docs) {
    body.push({ index: { _index: INDEX, _id: d.id } });
    body.push(d);
  }

  const resp = await client.bulk({
    body,
    refresh: true, // search immediately after ingest
  });

  const out = resp?.body || resp;
  const errors = Boolean(out?.errors);
  const items = out?.items || [];
  const indexed = items.length;

  return { indexed, errors };
}

// ---------- Route ----------
export async function POST(req) {
  // ✅ Vercel safety: don’t allow ingest in prod until OPENSEARCH_URL is real
  if (!process.env.OPENSEARCH_URL && process.env.VERCEL) {
    return Response.json(
      {
        ok: false,
        error:
          "Jobs ingest is disabled in production until OPENSEARCH_URL is set. It works locally with Docker OpenSearch.",
      },
      { status: 200 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const greenhouseBoards = Array.isArray(body.greenhouseBoards) ? body.greenhouseBoards : ["stripe"];
    const leverCompanies = Array.isArray(body.leverCompanies) ? body.leverCompanies : ["netlify"];

    const pulls = await Promise.allSettled([
      ...greenhouseBoards.map((b) => fetchGreenhouse(b)),
      ...leverCompanies.map((c) => fetchLever(c)),
    ]);

    let jobs = [];
    for (const p of pulls) {
      if (p.status === "fulfilled") jobs = jobs.concat(p.value);
    }

    const enriched = jobs
      .filter((j) => j && j.id && j.title)
      .map((job) => {
        const attrs = extractAttributes(job);
        const scored = scoreResilience(attrs);

        return {
          ...job,

          // feature store
          attributes_v1: attrs,

          // scoring (reproducible)
          resilience_score: scored.score,
          resilience_reason: scored.reason,
          score_version: scored.scoreVersion,

          // ranking placeholders
          compression_stability: 0.7,
          employer_ai_risk: 0.4,
        };
      });

    const result = await bulkUpsertJobs(enriched);

    return Response.json({
      ok: true,
      pulled: jobs.length,
      indexed: result.indexed,
      errors: result.errors,
    });
  } catch (e) {
    return Response.json(
      { ok: false, error: e?.message || "Unknown error" },
      { status: 200 }
    );
  }
}
