// lib/opensearch.js
import { Client } from "@opensearch-project/opensearch";

const raw = process.env.OPENSEARCH_URL;

if (!raw) {
  // In production we want this to fail loud so you notice env isn't set
  throw new Error("Missing OPENSEARCH_URL environment variable");
}

let node = raw;
let username = process.env.OPENSEARCH_USERNAME || "";
let password = process.env.OPENSEARCH_PASSWORD || "";

// If someone accidentally pastes https://user:pass@host, strip it safely
try {
  const u = new URL(raw);
  if (u.username && u.password) {
    username = username || decodeURIComponent(u.username);
    password = password || decodeURIComponent(u.password);
    node = `${u.protocol}//${u.host}`; // removes credentials
  }
} catch {
  // ignore
}

const client = new Client({
  node,
  ...(username && password ? { auth: { username, password } } : {}),
  // Bonsai is HTTPS. This helps avoid weird TLS config issues.
  ssl: { rejectUnauthorized: true },
});

export default client;
