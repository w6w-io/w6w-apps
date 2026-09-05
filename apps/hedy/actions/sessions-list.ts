import type { ActionDefinition } from "@w6w/types";
import { HedyClient } from "../lib/client.ts";

/**
 * `GET /sessions` — a paginated list of the account's meeting sessions.
 *
 * Per the `SessionList` schema, each item is a reduced projection (`id`,
 * `title`, `startTime`, `duration`, `recap`) — the full transcript, structured
 * conversation history and meeting minutes are only on the detail read
 * (`session-get`), which is why this action exists separately rather than
 * always fetching everything.
 */
interface Input {
  limit?: number;
}

interface SessionListItem {
  id?: string;
  title?: string;
  startTime?: string;
  duration?: number;
  recap?: string;
}

const sessionsList: ActionDefinition<Input> = {
  key: "sessions-list",
  type: "search",
  resource: "session",
  title: "List Sessions",
  description: "List meeting sessions with basic information (title, time, duration, recap).",
  params: [
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 50,
      hint: "Maximum number of sessions to return. Vendor default 50, maximum 100.",
      validation: { min: 1, max: 100, integer: true },
    },
  ],
  output: [
    { key: "items", type: "array", label: "Sessions" },
    { key: "hasMore", type: "boolean", label: "Whether more sessions exist past this page" },
    { key: "next", type: "string", label: "Cursor for the next page, when hasMore is true" },
    { key: "total", type: "number", label: "Total matching sessions" },
  ],

  async execute(input, ctx) {
    const { data, pagination } = await new HedyClient(ctx).get<SessionListItem[]>("/sessions", {
      limit: input.limit,
    });
    return {
      items: data ?? [],
      hasMore: pagination?.hasMore,
      next: pagination?.next,
      total: pagination?.total,
    };
  },
};

export default sessionsList;
