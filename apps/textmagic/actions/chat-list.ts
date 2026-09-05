import type { ActionDefinition } from "@w6w/types";
import { compact, TextMagicClient, type TmPage } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/**
 * `GET /api/v2/chats` — this account's two-way conversations.
 *
 * `status` selects `a` (active) / `c` (closed) / `d` (deleted); leaving it
 * unset returns TextMagic's own default (active chats).
 */
interface Input {
  status?: "a" | "c" | "d";
  page?: number;
  limit?: number;
  voice?: number;
  flat?: number;
}

const chatList: ActionDefinition<Input> = {
  key: "chat-list",
  type: "read",
  resource: "chat",
  title: "List Chats",
  description: "List two-way conversations.",
  params: [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "Active", value: "a" },
        { label: "Closed", value: "c" },
        { label: "Deleted", value: "d" },
      ],
    },
    ...paginationParams,
    { key: "voice", label: "Include voice calls", type: "number", hint: "1 to include." },
    { key: "flat", label: "Include contact info", type: "number", hint: "1 to include." },
  ],
  output: [
    { key: "page", type: "number", label: "Current page" },
    { key: "pageCount", type: "number", label: "Total number of pages" },
    { key: "limit", type: "number", label: "Results per page" },
    { key: "resources", type: "array", label: "Chats" },
  ],

  execute(input, ctx) {
    return new TextMagicClient(ctx).json<TmPage<unknown>>("/chats", {
      query: compact({ ...input }),
    });
  },
};

export default chatList;
