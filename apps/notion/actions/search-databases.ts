import type { ActionDefinition } from "@w6w/types";
import { NotionClient, type NotionListResponse } from "../lib/client.ts";

interface Sort {
  direction?: "ascending" | "descending";
  timestamp?: "last_edited_time";
}

interface Input {
  query?: string;
  sort?: Sort;
  pageSize?: number;
  startCursor?: string;
}

/**
 * Search across databases by title text. Same /search endpoint as
 * list-databases, just with an optional `query` string and an optional sort.
 */
const searchDatabases: ActionDefinition<Input> = {
  key: "search-databases",
  type: "search",
  resource: "database",
  title: "Search Databases",
  description: "Search databases by title. Returns one page — pass `startCursor` back to walk.",
  params: [
    { key: "query", label: "Query", type: "string", hint: "Free-text search against database titles." },
    { key: "sort", label: "Sort", type: "json", hint: "Notion sort object, e.g. `{\"direction\":\"descending\",\"timestamp\":\"last_edited_time\"}`." },
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
    const body: Record<string, unknown> = {
      filter: { property: "object", value: "database" },
      page_size: input.pageSize ?? 100,
    };
    if (input.query) body.query = input.query;
    if (input.sort) body.sort = input.sort;
    if (input.startCursor) body.start_cursor = input.startCursor;
    return client.request<NotionListResponse>("/search", { method: "POST", body });
  },
};

export default searchDatabases;
