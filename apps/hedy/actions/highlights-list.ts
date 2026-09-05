import type { ActionDefinition } from "@w6w/types";
import { HedyClient } from "../lib/client.ts";

/**
 * `GET /highlights` — a paginated list of AI-extracted highlights across the
 * account's sessions.
 *
 * Per the `HighlightList` schema, each item carries the session it belongs to
 * (`sessionId`), a timestamp, and the cleaned quote plus a one-line summary —
 * the raw quote, the millisecond offset into the session, and the model's
 * `aiInsight` are only on the detail read (`highlight-get`).
 */
interface Input {
  limit?: number;
}

interface HighlightListItem {
  id?: string;
  sessionId?: string;
  timestamp?: string;
  cleanedQuote?: string;
  summary?: string;
}

const highlightsList: ActionDefinition<Input> = {
  key: "highlights-list",
  type: "search",
  resource: "highlight",
  title: "List Highlights",
  description: "List AI-extracted highlights (key quotes and moments) across meeting sessions.",
  params: [
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 50,
      hint: "Maximum number of highlights to return. Vendor default 50, maximum 100.",
      validation: { min: 1, max: 100, integer: true },
    },
  ],
  output: [
    { key: "items", type: "array", label: "Highlights" },
    { key: "hasMore", type: "boolean", label: "Whether more highlights exist past this page" },
    { key: "next", type: "string", label: "Cursor for the next page, when hasMore is true" },
    { key: "total", type: "number", label: "Total matching highlights" },
  ],

  async execute(input, ctx) {
    const { data, pagination } = await new HedyClient(ctx).get<HighlightListItem[]>(
      "/highlights",
      { limit: input.limit },
    );
    return {
      items: data ?? [],
      hasMore: pagination?.hasMore,
      next: pagination?.next,
      total: pagination?.total,
    };
  },
};

export default highlightsList;
