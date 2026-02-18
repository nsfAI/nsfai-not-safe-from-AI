// app/api/vector/recommend/route.js
import { recommendVector } from "../../../../lib/vector/scoring";
import { TASK_KEYS } from "../../../../lib/vector/roles";

export const dynamic = "force-dynamic";

function normalizeTaskVector(weighted = {}) {
  // weighted expected { key: hoursOrWeight }
  const out = {};
  let sum = 0;
  for (const k of TASK_KEYS) {
    const v = Math.max(0, Number(weighted[k] ?? 0));
    out[k] = v;
    sum += v;
  }
  if (!sum) {
    const u = 1 / TASK_KEYS.length;
    for (const k of TASK_KEYS) out[k] = u;
    return out;
  }
  for (const k of TASK_KEYS) out[k] = out[k] / sum;
  return out;
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));

    const userTaskVector = normalizeTaskVector(body.taskWeights || {});
    const userSkills = body.skills || [];
    const userSeniority = body.seniority || "";
    const constraints = body.constraints || {};

    const stabilityVsUpside = Number(body.stabilityVsUpside ?? 0.6);
    const acceptableSectors = body.acceptableSectors || [];
    const avoidSectors = body.avoidSectors || [];

    const recs = recommendVector({
      userTaskVector,
      userSkills,
      userSeniority,
      constraints,
      stabilityVsUpside,
      acceptableSectors,
      avoidSectors,
    });

    return Response.json({
      ok: true,
      recommendations: recs,
      meta: {
        produced: recs.length,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (e) {
    return Response.json(
      { ok: false, error: e?.message || "Unknown error" },
      { status: 200 }
    );
  }
}
