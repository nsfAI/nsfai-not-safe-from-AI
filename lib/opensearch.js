// lib/opensearch.js
import { Client } from "@opensearch-project/opensearch";

const node = process.env.OPENSEARCH_URL; // host only, no creds in URL
const username = process.env.OPENSEARCH_USERNAME;
const password = process.env.OPENSEARCH_PASSWORD;

if (!node) {
  throw new Error("Missing OPENSEARCH_URL env var");
}

const client = new Client({
  node,
  auth: username && password ? { username, password } : undefined,
  ssl: {
    rejectUnauthorized: true,
  },
});

export default client;
