import type { ActionDefinition } from "@w6w/types";
import { NotionClient, type NotionListResponse } from "../lib/client.ts";

interface Input {
  databaseId: string;
  filter?: unknown;
  sorts?: unknown[];
  pageSize?: number;
  startCursor?: string;
}

/**
 * Notion's /databases/:id/query is the canonical way to list rows in a
 * database. Filters and sorts are the same object shapes documented at
 * https://developers.notion.com/reference/post-database-query — we pass them
 * through verbatim so callers stay in lockstep with Notion's docs.
 */
const getManyDatabasePages: ActionDefinition<Input, NotionListResponse> = {
  key: "get-many-database-pages",
  type: "read",
  resource: "databasePage",
  title: "Get Many Database Pages",
  description: "Query the pages in a database. Returns one page — pass `startCursor` back to walk.",
  params: [
    { key: "databaseId", label: "Database ID", type: "string", required: true },
    { key: "filter", label: "Filter", type: "json", hint: "Notion filter object. See developers.notion.com filter reference." },
    { key: "sorts", label: "Sorts", type: "json", hint: "Notion sort array." },
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
      page_size: input.pageSize ?? 100,
    };
    if (input.filter) body.filter = input.filter;
    if (input.sorts) body.sorts = input.sorts;
    if (input.startCursor) body.start_cursor = input.startCursor;
    return client.request<NotionListResponse>(`/databases/${input.databaseId}/query`, {
      method: "POST",
      body,
    });
  },
};

export default getManyDatabasePages;
