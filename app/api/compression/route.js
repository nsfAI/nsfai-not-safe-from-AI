export const runtime = "nodejs"; // keep it node (not edge) for compatibility

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function toBand(score) {
  if (score >= 75) return "Very high compression";
  if (score >= 55) return "High compression";
  if (score >= 35) return "Moderate compression";
  return "Low compression";
}

// Deterministic pseudo-random (so series is stable per sector/skill/range)
function seededRand(seed) {
  let x = 0;
  for (let i = 0; i < seed.length; i++) x = (x * 31 + seed.charCodeAt(i)) >>> 0;
  return () => {
    // xorshift32
    x ^= x << 13; x >>>= 0;
    x ^= x >> 17; x >>>= 0;
    x ^= x << 5;  x >>>= 0;
    return (x >>> 0) / 4294967296;
  };
}

/**
 * MOCK generator (MVP):
 * Produces plausible dynamics:
 * - jobs decline leads
 * - layoffs follow with lag
 * - adoption proxy rises steadily
 */
function generateMockSeries({ sector, skill, days }) {
  const seed = `${sector}|${skill}|${days}`;
  const rand = seededRand(seed);

  // Base levels differ by sector/skill to avoid everything looking identical
  const baseJobs = clamp(45 + (rand() * 20 - 10), 20, 70);
  const baseLayoffs = clamp(35 + (rand() * 20 - 10), 10, 65);
  const baseAdopt = clamp(40 + (rand() * 20 - 10), 15, 75);

  const series = [];
  let jobs = baseJobs;
  let layoffs = baseLayoffs;
  let adopt = baseAdopt;

  // Scenario bias: tech + SWE feels more compressed; trades less
  const bias =
    sector === "Tech" || skill === "Software Engineering" || skill === "Data / Analytics"
      ? 0.15
      : skill === "Skilled Trades" || skill === "Healthcare Clinical"
      ? -0.12
      : 0;

  for (let d = days - 1; d >= 0; d--) {
    // Drift + noise
    const t = (days - d) / days;

    // adoption trends up
    adopt += (0.10 + bias) + (rand() - 0.5) * 0.8;

    // jobs decline more volatile; adoption amplifies it
    jobs += (0.02 + bias) + (rand() - 0.5) * 1.6 + (adopt - 50) * 0.01;

    // layoffs respond w/ lag and are spikier
    layoffs += (0.01 + bias) + (rand() - 0.5) * 1.2 + (jobs - 50) * 0.006;

    // clamp to 0..100
    adopt = clamp(adopt, 0, 100);
    jobs = clamp(jobs, 0, 100);
    layoffs = clamp(layoffs, 0, 100);

    // Weighted index
    const index = clamp(Math.round(0.40 * jobs + 0.35 * layoffs + 0.25 * adopt), 0, 100);

    // Create a date label (ISO)
    const date = new Date(Date.now() - d * 24 * 60 * 60 * 1000);
    const dateISO = date.toISOString().slice(0, 10);

    series.push({
      date: dateISO,
      layoffsScore: Math.round(layoffs),
      jobsScore: Math.round(jobs),
      adoptionScore: Math.round(adopt),
      index,
    });
  }

  return series;
}

/**
 * In the future you can replace these with real data ingestion.
 * For now, we keep it simple + safe + always returns valid JSON.
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const sector = (searchParams.get("sector") || "All").slice(0, 60);
    const skill = (searchParams.get("skill") || "All").slice(0, 80);
    const range = clamp(parseInt(searchParams.get("range") || "180", 10), 30, 365);

    const days = range;

    // Data mode: if you later add env vars, switch to real mode.
    // For now, mock. (But the API contract stays identical.)
    const mode = "mock";

    const series = generateMockSeries({ sector, skill, days });

    const latest = series[series.length - 1];
    const prev = series[series.length - 2] || null;

    const latestPayload = {
      asOf: new Date().toISOString().slice(0, 16).replace("T", " "),
      index: latest.index,
      delta: prev ? latest.index - prev.index : 0,
      band: toBand(latest.index),
      layoffsScore: latest.layoffsScore,
      jobsScore: latest.jobsScore,
      adoptionScore: latest.adoptionScore,
    };

    return Response.json(
      {
        ok: true,
        filters: { sector, skill, range: days },
        latest: latestPayload,
        series: series.map((d) => ({ date: d.date, index: d.index })), // chart series
        componentsSeries: series, // if you want to chart components later
        meta: {
          mode,
          weights: { jobs: 0.4, layoffs: 0.35, adoption: 0.25 },
          note:
            "Mock series until you wire real feeds. API contract remains stable.",
        },
      },
      { status: 200 }
    );
  } catch (e) {
    return Response.json(
      { ok: false, error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
