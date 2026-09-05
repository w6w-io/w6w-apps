import type { ActionDefinition } from "@w6w/types";
import { compact, TextMagicClient, type TmPage } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/**
 * `GET /api/v2/chats/{id}/message` — a chat's message history.
 *
 * The path is singular (`/message`, not `/messages`) despite returning a
 * paginated list — verified against the live OpenAPI document, not a typo
 * carried over from a sibling app.
 */
interface Input {
  id: number;
  page?: number;
  limit?: number;
  query?: string;
  start?: string;
  end?: string;
  direction?: "asc" | "desc";
  voice?: number;
  includeNotes?: number;
}

const chatMessagesGet: ActionDefinition<Input> = {
  key: "chat-messages-get",
  type: "read",
  resource: "chat",
  title: "Get Chat Messages",
  description: "Fetch a chat's message history.",
  params: [
    { key: "id", label: "Chat ID", type: "number", required: true },
    ...paginationParams,
    { key: "query", label: "Search query", type: "string" },
    {
      key: "start",
      label: "Start timestamp",
      type: "string",
      hint: "Required together with end.",
    },
    { key: "end", label: "End timestamp", type: "string", hint: "Required together with start." },
    {
      key: "direction",
      label: "Direction",
      type: "select",
      options: [{ label: "Ascending", value: "asc" }, { label: "Descending", value: "desc" }],
    },
    { key: "voice", label: "Include voice calls", type: "number", hint: "1 to include." },
    {
      key: "includeNotes",
      label: "Include messenger notes",
      type: "number",
      hint: "1 to include.",
    },
  ],
  output: [
    { key: "page", type: "number", label: "Current page" },
    { key: "pageCount", type: "number", label: "Total number of pages" },
    { key: "limit", type: "number", label: "Results per page" },
    { key: "resources", type: "array", label: "Chat messages" },
  ],

  execute(input, ctx) {
    const { id, ...query } = input;
    return new TextMagicClient(ctx).json<TmPage<unknown>>(
      `/chats/${encodeURIComponent(id)}/message`,
      { query: compact(query) },
    );
  },
};

export default chatMessagesGet;
