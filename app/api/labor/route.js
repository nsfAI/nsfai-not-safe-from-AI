// app/api/labor/route.js
// Pulls (1) BLS unemployment rate (monthly) and (2) layoff headlines (multi-source, daily-ish)

export const dynamic = "force-dynamic";

function safeText(s) {
  return String(s ?? "").replace(/\s+/g, " ").trim();
}

function parseDate(d) {
  const t = Date.parse(d || "");
  return Number.isFinite(t) ? t : 0;
}

function normalizeTitle(t) {
  return safeText(t)
    .toLowerCase()
    .replace(/\b(inc|llc|ltd|corp|corporation|company)\b/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// -------------------- BLS: U-3 Unemployment Rate (LNS14000000) --------------------
async function fetchUnemploymentRate() {
  const now = new Date();
  const endYear = now.getFullYear();
  const startYear = endYear - 1;

  const res = await fetch("https://api.bls.gov/publicAPI/v2/timeseries/data/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      seriesid: ["LNS14000000"],
      startyear: String(startYear),
      endyear: String(endYear),
    }),
    cache: "force-cache",
  });

  if (!res.ok) throw new Error(`BLS fetch failed: ${res.status}`);

  const json = await res.json();
  const series = json?.Results?.series?.[0];
  const data = series?.data || [];

  const latest = data[0];
  if (!latest) throw new Error("BLS returned no data");

  return {
    value: Number(latest.value), // percent
    label: `${latest.periodName} ${latest.year}`,
    seriesId: "LNS14000000",
  };
}

// -------------------- RSS parsing (simple + robust enough) --------------------
// Tries RSS (<item>) and Atom (<entry>) patterns.
function parseRssOrAtom(xml, { sourceLabel }) {
  const items = [];

  // RSS <item>
  const rssItems = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((m) => m[1]);
  for (const block of rssItems) {
    const title =
      block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i)?.[1] ||
      block.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ||
      "";
    const link =
      block.match(/<link>([\s\S]*?)<\/link>/i)?.[1] ||
      block.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i)?.[1] ||
      "";
    const pubDate = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1] || "";

    const t = safeText(title);
    const l = safeText(link);
    if (!t || !l) continue;

    items.push({
      title: t,
      link: l,
      pubDate: safeText(pubDate),
      ts: parseDate(pubDate),
      source: sourceLabel,
    });
  }

  // Atom <entry>
  if (!items.length) {
    const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)].map((m) => m[1]);
    for (const block of entries) {
      const title =
        block.match(/<title[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i)?.[1] ||
        block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ||
        "";
      const link =
        block.match(/<link[^>]+href="([^"]+)"/i)?.[1] ||
        block.match(/<id>([\s\S]*?)<\/id>/i)?.[1] ||
        "";
      const pubDate =
        block.match(/<updated>([\s\S]*?)<\/updated>/i)?.[1] ||
        block.match(/<published>([\s\S]*?)<\/published>/i)?.[1] ||
        "";

      const t = safeText(title);
      const l = safeText(link);
      if (!t || !l) continue;

      items.push({
        title: t,
        link: l,
        pubDate: safeText(pubDate),
        ts: parseDate(pubDate),
        source: sourceLabel,
      });
    }
  }

  return items;
}

async function fetchFeed(url, sourceLabel) {
  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      // a light UA helps some feeds that block default fetch
      "User-Agent": "nsfAI-labor-ticker/1.0 (+https://your-site-domain)",
      Accept: "application/rss+xml, application/atom+xml, text/xml, application/xml;q=0.9,*/*;q=0.8",
    },
  });
  if (!res.ok) throw new Error(`Feed failed ${res.status} for ${sourceLabel}`);
  const xml = await res.text();
  return parseRssOrAtom(xml, { sourceLabel });
}

// -------------------- Layoff headlines (multi-source) --------------------
async function fetchLayoffHeadlines() {
  // ✅ Add/Remove sources here.
  // Keep it mostly RSS/Atom to avoid scraping bans.
  const FEEDS = [
    // Layoffs.fyi (your existing priority)
    { label: "Layoffs.fyi", url: "https://layoffs.fyi/feed/" },

    // Google News RSS query (very “flooded”)
    // You can tweak queries to get different vibes
    {
      label: "Google News",
      url: "https://news.google.com/rss/search?q=layoffs+OR+laid+off+OR+job+cuts+when:7d&hl=en-US&gl=US&ceid=US:en",
    },
    {
      label: "Google News (Tech)",
      url: "https://news.google.com/rss/search?q=tech+layoffs+OR+startup+layoffs+when:14d&hl=en-US&gl=US&ceid=US:en",
    },
    {
      label: "Google News (Banking)",
      url: "https://news.google.com/rss/search?q=bank+layoffs+OR+finance+job+cuts+when:14d&hl=en-US&gl=US&ceid=US:en",
    },
  ];

  // Pull all feeds in parallel (and don’t die if one fails)
  const results = await Promise.allSettled(FEEDS.map((f) => fetchFeed(f.url, f.label)));

  let merged = [];
  for (const r of results) {
    if (r.status === "fulfilled") merged = merged.concat(r.value);
  }

  // If everything failed, return empty list (front-end shows “loading”)
  if (!merged.length) return { items: [] };

  // Dedupe by normalized title (helps remove repeats across sources)
  const seen = new Set();
  const deduped = [];
  for (const it of merged) {
    const key = normalizeTitle(it.title);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(it);
  }

  // Sort newest first (fallback ts=0 puts unknown dates at bottom)
  deduped.sort((a, b) => (b.ts || 0) - (a.ts || 0));

  // Limit to keep payload light
  const items = deduped.slice(0, 16).map(({ ts, ...rest }) => rest);

  return { items };
}

export async function GET() {
  try {
    const [unemployment, layoffs] = await Promise.all([
      fetchUnemploymentRate(),
      fetchLayoffHeadlines(),
    ]);

    return Response.json({
      ok: true,
      unemployment,
      layoffs,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        error: err?.message || "Unknown error",
        updatedAt: new Date().toISOString(),
      },
      { status: 200 }
    );
  }
}
