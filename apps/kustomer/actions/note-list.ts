import type { ActionDefinition } from "@w6w/types";
import { KustomerClient } from "../lib/client.ts";
import { listOutput, pagination } from "../lib/params.ts";

interface Input {
  conversationId: string;
  page?: number;
  pageSize?: number;
}

/** `GET /v1/conversations/{id}/notes` — verified against the Core Resources OAS. */
const noteList: ActionDefinition<Input> = {
  key: "note-list",
  type: "read",
  resource: "note",
  title: "List Notes",
  description: "Page through the internal notes on a conversation.",
  params: [
    { key: "conversationId", label: "Conversation ID", type: "string", required: true },
    ...pagination,
  ],
  output: listOutput,

  execute(input, ctx) {
    return new KustomerClient(ctx).json(
      `/conversations/${encodeURIComponent(input.conversationId)}/notes`,
      { query: { page: input.page, pageSize: input.pageSize } },
    );
  },
};

export default noteList;
