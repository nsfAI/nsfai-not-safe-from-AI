// lib/opensearch.js
// Works with BOTH OpenSearch (Docker) and Elasticsearch (Bonsai) using fetch.
// Uses OPENSEARCH_URL env var in production, falls back to localhost for dev.

const BASE = process.env.OPENSEARCH_URL || "http://localhost:9200";

function authHeader() {
  try {
    const u = new URL(BASE);
    if (u.username && u.password) {
      const token = Buffer.from(`${u.username}:${u.password}`).toString("base64");
      return `Basic ${token}`;
    }
  } catch {}
  return null;
}

async function osFetch(path, { method = "GET", headers = {}, body } = {}) {
  const url = `${BASE.replace(/\/$/, "")}${path}`;
  const h = { ...headers };

  const auth = authHeader();
  if (auth) h.Authorization = auth;

  const res = await fetch(url, { method, headers: h, body, cache: "no-store" });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    const msg =
      json?.error?.reason ||
      json?.error?.type ||
      json?.message ||
      `OpenSearch/ES HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.details = json;
    throw err;
  }

  return json;
}

function toNdjson(lines) {
  return lines.map((l) => JSON.stringify(l)).join("\n") + "\n";
}

const client = {
  async search({ index, body }) {
    const data = await osFetch(`/${encodeURIComponent(index)}/_search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    return { body: data };
  },

  async bulk({ body, refresh = false }) {
    const qs = refresh ? "?refresh=true" : "";
    const data = await osFetch(`/_bulk${qs}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-ndjson" },
      body: toNdjson(body || []),
    });
    return { body: data };
  },

  async count({ index }) {
    const data = await osFetch(`/${encodeURIComponent(index)}/_count`, {
      method: "GET",
    });
    return { body: data };
  },

  async indicesExists(index) {
    try {
      await osFetch(`/${encodeURIComponent(index)}`, { method: "HEAD" });
      return true;
    } catch {
      return false;
    }
  },
};

export default client;
