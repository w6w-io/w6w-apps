import type { ActionDefinition } from "@w6w/types";
import {
  compact,
  ManusClient,
  type SearchResult,
  toSearchResult,
  type UsageListResponse,
  type UsageRecord,
} from "../lib/client.ts";
import { cursorParams } from "../lib/params.ts";

interface Input {
  cursor?: string;
  limit?: number;
}

/**
 * `GET /v2/usage.list` — the caller's credit change history at session
 * (task) granularity, newest first: consumption, refunds, subscription
 * grants and admin adjustments.
 */
const usageList: ActionDefinition<Input, SearchResult<UsageRecord>> = {
  key: "usage-list",
  type: "search",
  resource: "usage",
  title: "List Usage",
  description: "List the account's credit change history, one entry per task.",
  params: cursorParams(20, 100),
  output: [
    { key: "items", type: "array", label: "Usage records" },
    { key: "nextCursor", type: "string", label: "Pass into Cursor for the next page" },
  ],

  async execute(input, ctx) {
    const res = await new ManusClient(ctx).request<UsageListResponse>("/v2/usage.list", {
      query: compact({ cursor: input.cursor, limit: input.limit }),
    });
    return toSearchResult(res.data, res.has_more, res.next_cursor);
  },
};

export default usageList;
