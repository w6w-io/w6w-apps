import type { ActionDefinition } from "@w6w/types";
import { compact, TextMagicClient, type TmPage } from "../lib/client.ts";

/**
 * `GET /api/v2/messages` — this account's outbound messages, newest first.
 *
 * Paginated with TextMagic's flat `{page, pageCount, limit, resources}` shape
 * — there is no `total` count, only a page count. `lastId` is a cursor
 * alternative to `page` ("all messages with an ID lower than this"); the
 * vendor's own docs note `page` is ignored when `lastId` is set.
 */
interface Input {
  page?: number;
  limit?: number;
  lastId?: number;
}

const messageList: ActionDefinition<Input> = {
  key: "message-list",
  type: "read",
  resource: "message",
  title: "List Messages",
  description: "List outbound messages, newest first.",
  params: [
    { key: "page", label: "Page", type: "number", hint: "Ignored when lastId is set. Default 1." },
    { key: "limit", label: "Results per page", type: "number", hint: "1–100, default 10." },
    {
      key: "lastId",
      label: "Last ID cursor",
      type: "number",
      hint: "Return only messages with an ID lower than this. Overrides page.",
    },
  ],
  output: [
    { key: "page", type: "number", label: "Current page" },
    { key: "pageCount", type: "number", label: "Total number of pages" },
    { key: "limit", type: "number", label: "Results per page" },
    { key: "resources", type: "array", label: "Messages" },
  ],

  execute(input, ctx) {
    return new TextMagicClient(ctx).json<TmPage<unknown>>("/messages", {
      query: compact({ ...input }),
    });
  },
};

export default messageList;
