import type { ActionDefinition } from "@w6w/types";
import {
  compact,
  ManusClient,
  type SearchResult,
  type TeamUsageLog,
  toSearchResult,
  type UsageTeamLogResponse,
} from "../lib/client.ts";
import { cursorParams } from "../lib/params.ts";

interface Input {
  cursor?: string;
  limit?: number;
  startDate?: number;
  endDate?: number;
  sortBy?: string;
  isAsc?: boolean;
}

/**
 * `GET /v2/usage.teamLog` — one row per team member: task count and total
 * credit consumption over the requested range.
 */
const usageTeamLog: ActionDefinition<Input, SearchResult<TeamUsageLog>> = {
  key: "usage-team-log",
  type: "search",
  resource: "usage",
  title: "List Team Usage Log",
  description: "List each team member's task count and credit consumption over a date range.",
  params: [
    ...cursorParams(20, 100),
    {
      key: "startDate",
      label: "Start date",
      type: "number",
      hint: "Unix seconds. Omit for no lower bound.",
    },
    {
      key: "endDate",
      label: "End date",
      type: "number",
      hint: "Unix seconds. Omit for no upper bound.",
    },
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      options: [
        { value: "task_count", label: "Task count (default)" },
        { value: "credits", label: "Credits" },
      ],
      advanced: true,
    },
    {
      key: "isAsc",
      label: "Ascending",
      type: "boolean",
      default: false,
      advanced: true,
    },
  ],
  output: [
    { key: "items", type: "array", label: "Per-member usage rows" },
    { key: "nextCursor", type: "string", label: "Pass into Cursor for the next page" },
  ],

  async execute(input, ctx) {
    const res = await new ManusClient(ctx).request<UsageTeamLogResponse>("/v2/usage.teamLog", {
      query: compact({
        cursor: input.cursor,
        limit: input.limit,
        start_date: input.startDate,
        end_date: input.endDate,
        sort_by: input.sortBy,
        is_asc: input.isAsc,
      }),
    });
    return toSearchResult(res.data, res.has_more, res.next_cursor);
  },
};

export default usageTeamLog;
