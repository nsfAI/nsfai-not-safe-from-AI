import { Client } from "@opensearch-project/opensearch";

const OPENSEARCH_URL = process.env.OPENSEARCH_URL;

if (!OPENSEARCH_URL) {
  // Avoid crashing builds, but make it obvious in API responses.
  console.warn("Missing OPENSEARCH_URL environment variable.");
}

function makeClient() {
  if (!OPENSEARCH_URL) return null;

  const u = new URL(OPENSEARCH_URL);

  // Bonsai is https + basic auth
  const node = `${u.protocol}//${u.host}`;
  const auth = u.username
    ? { username: u.username, password: u.password }
    : undefined;

  return new Client({
    node,
    auth,
    ssl: { rejectUnauthorized: true },
  });
}

const client = makeClient();
export default client;
