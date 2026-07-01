import type { ActionDefinition } from "@w6w/types";
import { NotionClient, type NotionListResponse } from "../lib/client.ts";

interface Input {
  pageSize?: number;
  startCursor?: string;
}

/**
 * Notion has no dedicated "list databases" endpoint — the /search endpoint
 * with a `filter.property=object, value=database` clause is the sanctioned
 * pattern. That's exactly what n8n's databaseGetAll does under the hood.
 */
const listDatabases: ActionDefinition<Input> = {
  key: "list-databases",
  type: "read",
  resource: "database",
  title: "List Databases",
  description: "List all databases the integration has access to. One page per call — pass `startCursor` back to walk.",
  params: [
    { key: "pageSize", label: "Page size", type: "number", default: 100 },
    { key: "startCursor", label: "Start cursor", type: "string" },
  ],
  output: [
    { key: "results", type: "array", label: "Databases" },
    { key: "next_cursor", type: "string", label: "Next cursor" },
    { key: "has_more", type: "boolean", label: "Has more" },
  ],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request<NotionListResponse>("/search", {
      method: "POST",
      body: {
        filter: { property: "object", value: "database" },
        page_size: input.pageSize ?? 100,
        start_cursor: input.startCursor,
      },
    });
  },
};

export default listDatabases;
