import type { ActionDefinition } from "@w6w/types";
import { NotionClient, type NotionListResponse } from "../lib/client.ts";

interface Input {
  query?: string;
  sort?: { direction?: "ascending" | "descending"; timestamp?: "last_edited_time" };
  pageSize?: number;
  startCursor?: string;
}

/**
 * Notion's page search — same /search endpoint as list-databases, but
 * filtered to `object=page`. Serves as both "list all pages" (no query) and
 * "search by title".
 */
const searchPages: ActionDefinition<Input, NotionListResponse> = {
  key: "search-pages",
  type: "search",
  resource: "page",
  title: "Search Pages",
  description: "Search pages by title, or list all pages the integration can access.",
  params: [
    { key: "query", label: "Query", type: "string", hint: "Free-text search against page titles. Omit to list all pages." },
    { key: "sort", label: "Sort", type: "json" },
    { key: "pageSize", label: "Page size", type: "number", default: 100 },
    { key: "startCursor", label: "Start cursor", type: "string" },
  ],
  output: [
    { key: "results", type: "array", label: "Pages" },
    { key: "next_cursor", type: "string", label: "Next cursor" },
    { key: "has_more", type: "boolean", label: "Has more" },
  ],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    const body: Record<string, unknown> = {
      filter: { property: "object", value: "page" },
      page_size: input.pageSize ?? 100,
    };
    if (input.query) body.query = input.query;
    if (input.sort) body.sort = input.sort;
    if (input.startCursor) body.start_cursor = input.startCursor;
    return client.request<NotionListResponse>("/search", { method: "POST", body });
  },
};

export default searchPages;
