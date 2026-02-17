// app/api/labor/route.js
// Pulls (1) BLS unemployment rate (monthly) and (2) Layoffs.fyi latest posts (daily-ish proxy)

export const revalidate = 60 * 30; // 30 min cache

function safeText(s) {
  return String(s ?? "").replace(/\s+/g, " ").trim();
}

// ---- BLS: U-3 Unemployment Rate (Series: LNS14000000) ----
// Docs: https://www.bls.gov/developers/api_signature_v2.htm 
async function fetchUnemploymentRate() {
  const now = new Date();
  const endYear = now.getFullYear();
  const startYear = endYear - 1;

  const res = await fetch("https://api.bls.gov/publicAPI/v2/timeseries/data/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // No API key required for light usage; add registrationkey if you have one.
    body: JSON.stringify({
      seriesid: ["LNS14000000"],
      startyear: String(startYear),
      endyear: String(endYear),
    }),
    // Next will cache per revalidate above; also avoid edge quirks
    cache: "force-cache",
  });

  if (!res.ok) throw new Error(`BLS fetch failed: ${res.status}`);

  const json = await res.json();
  const series = json?.Results?.series?.[0];
  const data = series?.data || [];

  // BLS returns newest first
  const latest = data[0];
  if (!latest) throw new Error("BLS returned no data");

  const value = Number(latest.value);
  const periodName = latest.periodName; // e.g., "January"
  const year = latest.year;

  return {
    value, // percent (e.g., 3.9)
    label: `${periodName} ${year}`,
    seriesId: "LNS14000000",
  };
}

// ---- Layoffs.fyi: "daily-ish" announcements proxy ----
// Prefer RSS if available; fallback to scraping recent titles from author page
async function fetchLayoffsFyiHeadlines() {
  // Try common WP feed endpoints
  const feedUrls = [
    "https://layoffs.fyi/feed/",
    "https://layoffs.fyi/category/layoff/feed/",
    "https://layoffs.fyi/tag/layoff/feed/",
  ];

  for (const url of feedUrls) {
    try {
      const res = await fetch(url, { cache: "force-cache" });
      if (!res.ok) continue;

      const xml = await res.text();

      // Very small RSS parser (titles + links)
      const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
        .slice(0, 8)
        .map((m) => m[1]);

      const parsed = items
        .map((block) => {
          const title = safeText(
            (block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1] ||
              block.match(/<title>([\s\S]*?)<\/title>/)?.[1] ||
              "")
          );
          const link = safeText(block.match(/<link>([\s\S]*?)<\/link>/)?.[1] || "");
          const pubDate = safeText(block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || "");
          if (!title || !link) return null;
          return { title, link, pubDate };
        })
        .filter(Boolean);

      if (parsed.length) return { source: "rss", items: parsed };
    } catch {
      // try next
    }
  }

  // Fallback: scrape the author page list (not perfect, but works when feed is blocked)
  const fallbackUrl = "https://layoffs.fyi/author/webmasterlayoffs-fyi/";
  const res = await fetch(fallbackUrl, { cache: "force-cache" });
  if (!res.ok) throw new Error(`Layoffs.fyi fallback fetch failed: ${res.status}`);
  const html = await res.text();

  // Grab up to ~8 post links/titles from anchor tags
  const anchors = [...html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/g)]
    .map((m) => ({ link: m[1], title: safeText(m[2]) }))
    .filter((x) => x.link?.includes("layoffs.fyi/") && x.title && x.title.length > 6);

  // Dedupe by link
  const seen = new Set();
  const items = [];
  for (const a of anchors) {
    const link = a.link.split("#")[0];
    if (seen.has(link)) continue;
    seen.add(link);
    items.push({ title: a.title, link, pubDate: "" });
    if (items.length >= 8) break;
  }

  return { source: "scrape", items };
}

export async function GET() {
  try {
    const [unemployment, layoffs] = await Promise.all([
      fetchUnemploymentRate(),
      fetchLayoffsFyiHeadlines(),
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
