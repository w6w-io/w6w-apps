import type { ActionDefinition } from "@w6w/types";
import { NotionClient, type NotionListResponse } from "../lib/client.ts";

interface Input {
  limit?: number;
}

/**
 * Auto-walks /search until every database is fetched (or `limit` is hit).
 * Complement to list-databases which returns a single page and hands the
 * cursor back to the caller. Useful when you want a flat array without a loop.
 */
const getManyDatabases: ActionDefinition<Input, { results: unknown[] }> = {
  key: "get-many-databases",
  type: "read",
  resource: "database",
  title: "Get Many Databases",
  description: "Walk /search until every database has been fetched (or `limit` is reached).",
  params: [
    { key: "limit", label: "Limit", type: "number", hint: "Stop after this many. Omit for all." },
  ],
  output: [
    { key: "results", type: "array", label: "Databases" },
  ],

  async execute(input, ctx) {
    const client = new NotionClient(ctx);
    const limit = input.limit;
    const results: unknown[] = [];
    let startCursor: string | undefined;
    do {
      const body: Record<string, unknown> = {
        filter: { property: "object", value: "database" },
        page_size: limit ? Math.min(limit - results.length, 100) : 100,
      };
      if (startCursor) body.start_cursor = startCursor;
      const page = await client.request<NotionListResponse>("/search", {
        method: "POST",
        body,
      });
      results.push(...page.results);
      if (limit && results.length >= limit) return { results: results.slice(0, limit) };
      startCursor = page.next_cursor ?? undefined;
      if (!page.has_more) break;
    } while (startCursor);
    return { results };
  },
};

export default getManyDatabases;
