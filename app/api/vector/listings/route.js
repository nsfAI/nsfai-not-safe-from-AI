// app/api/vector/listings/route.js
import client from "../../../../lib/opensearch";

export const dynamic = "force-dynamic";
const INDEX = "jobs_v1";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const title = searchParams.get("title") || "";
    const limit = Math.min(Number(searchParams.get("limit") || 10), 25);

    if (!title.trim()) return Response.json({ ok: true, results: [] });

    const body = {
      size: limit,
      query: {
        multi_match: {
          query: title,
          fields: ["title^5", "description", "company^2", "location^2"],
          type: "best_fields",
          operator: "or",
          fuzziness: "AUTO",
        },
      },
      sort: [{ posted_ts: "desc" }],
    };

    const resp = await client.search({ index: INDEX, body });
    const hits = resp?.body?.hits?.hits || resp?.hits?.hits || [];

    const results = hits.map((h) => {
      const s = h?._source || {};
      return {
        id: h?._id,
        title: s.title || "",
        company: s.company || "",
        location: s.location || "",
        url: s.url || "",
        posted_ts: s.posted_ts || null,
        resilience_score: s.resilience_score ?? null,
      };
    });

    return Response.json({ ok: true, results });
  } catch (e) {
    return Response.json({ ok: false, error: e?.message || "Unknown error", results: [] }, { status: 200 });
  }
}
