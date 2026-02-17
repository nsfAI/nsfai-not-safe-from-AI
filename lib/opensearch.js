// lib/opensearch.js
import { Client } from "@opensearch-project/opensearch";

const node = process.env.OPENSEARCH_URL || "http://localhost:9200";

// IMPORTANT:
// - Locally: leave it default and Docker works.
// - On Vercel: set OPENSEARCH_URL to a real hosted endpoint,
//   OR the API routes should return a friendly "not configured" response.

const client = new Client({
  node,
  // If you later use a hosted cluster with auth:
  // auth: process.env.OPENSEARCH_USERNAME
  //   ? { username: process.env.OPENSEARCH_USERNAME, password: process.env.OPENSEARCH_PASSWORD || "" }
  //   : undefined,
  // ssl: { rejectUnauthorized: false }, // sometimes needed for managed clusters
});

export default client;
