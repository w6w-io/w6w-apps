import type { ActionDefinition } from "@w6w/types";
import { KustomerClient } from "../lib/client.ts";
import { listOutput, pagination } from "../lib/params.ts";

interface Input {
  conversationId: string;
  page?: number;
  pageSize?: number;
}

/** `GET /v1/conversations/{id}/messages` — verified against the Core Resources OAS. */
const messageList: ActionDefinition<Input> = {
  key: "message-list",
  type: "read",
  resource: "message",
  title: "List Messages",
  description: "Page through the messages on a conversation's timeline.",
  params: [
    { key: "conversationId", label: "Conversation ID", type: "string", required: true },
    ...pagination,
  ],
  output: listOutput,

  execute(input, ctx) {
    return new KustomerClient(ctx).json(
      `/conversations/${encodeURIComponent(input.conversationId)}/messages`,
      { query: { page: input.page, pageSize: input.pageSize } },
    );
  },
};

export default messageList;
