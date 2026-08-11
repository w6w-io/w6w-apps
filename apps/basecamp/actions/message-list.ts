import type { ActionDefinition } from "@w6w/types";
import { BasecampClient } from "../lib/client.ts";

/**
 * `GET /message_boards/{boardId}/messages.json` — a board's messages.
 *
 * The board id comes from a project's `dock`, not from a separate listing
 * endpoint — Basecamp has no "list message boards".
 */
interface Input {
  boardId: string;
  page?: number;
}

const messageList: ActionDefinition<Input> = {
  key: "message-list",
  type: "search",
  resource: "message",
  title: "List Messages",
  description: "List the messages on a project's message board.",
  params: [
    {
      key: "boardId",
      label: "Message board ID",
      type: "string",
      required: true,
      hint: "From the project's `dock` — Basecamp has no endpoint that lists boards.",
    },
    { key: "page", label: "Page", type: "number", validation: { integer: true, min: 1 } },
  ],
  output: [{ key: "[]", type: "array", label: "Messages" }],

  execute(input, ctx) {
    return new BasecampClient(ctx).request(
      `/message_boards/${encodeURIComponent(input.boardId)}/messages.json`,
      { query: { page: input.page } },
    );
  },
};

export default messageList;
