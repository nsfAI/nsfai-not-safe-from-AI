export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.OPENSEARCH_URL || "";
  return Response.json({
    ok: true,
    hasOpenSearchUrl: Boolean(url),
    openSearchHost: url ? (() => { try { return new URL(url).host; } catch { return null; } })() : null,
    vercelEnv: process.env.VERCEL_ENV || null, // production | preview | development
  });
}
