import type { ActionDefinition } from "@w6w/types";
import { assertIdentifier, compact, RespondioClient } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/**
 * `GET /contact/{identifier}/message/list` — `MessagingClient.list` in the
 * official SDK.
 */
interface Input {
  identifier: string;
  limit?: number;
  cursorId?: number;
}

const messageList: ActionDefinition<Input> = {
  key: "message-list",
  type: "search",
  resource: "message",
  title: "List Messages",
  description: "List the messages exchanged with a contact.",
  params: [
    { key: "identifier", label: "Contact identifier", type: "string", required: true },
    ...paginationParams(),
  ],
  output: [
    { key: "items", type: "array", label: "Messages" },
    { key: "pagination", type: "object", label: "Pagination cursor" },
  ],

  execute(input, ctx) {
    const identifier = assertIdentifier(input.identifier);
    return new RespondioClient(ctx).get(
      `/contact/${identifier}/message/list`,
      compact({ limit: input.limit, cursorId: input.cursorId }),
    );
  },
};

export default messageList;
