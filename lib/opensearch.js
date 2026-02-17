import { Client } from "@opensearch-project/opensearch";

const node =
  process.env.OPENSEARCH_URL ||
  (process.env.NODE_ENV === "production" ? "" : "http://localhost:9200");

const client = node ? new Client({ node }) : null;

export default client;
