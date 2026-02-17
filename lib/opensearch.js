// lib/opensearch.js
import { Client } from "@opensearch-project/opensearch";

function parseOpenSearchUrl(raw) {
  const fallback = "http://localhost:9200";
  const s = (raw || fallback).trim();

  const u = new URL(s);

  // Extract creds if present
  const username = u.username ? decodeURIComponent(u.username) : "";
  const password = u.password ? decodeURIComponent(u.password) : "";

  // IMPORTANT: remove creds from the URL string
  u.username = "";
  u.password = "";

  // Normalize: remove trailing slash
  const node = u.toString().replace(/\/$/, "");

  const auth = username ? { username, password } : undefined;

  return { node, auth };
}

const { node, auth } = parseOpenSearchUrl(process.env.OPENSEARCH_URL);

const client = new Client({
  node,
  auth,
  // Bonsai is HTTPS; keep TLS validation on
  ssl: node.startsWith("https") ? { rejectUnauthorized: true } : undefined,
});

export default client;
