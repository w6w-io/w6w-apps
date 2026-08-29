import type { ActionDefinition } from "@w6w/types";
import { KustomerClient } from "../lib/client.ts";
import { listOutput, pagination } from "../lib/params.ts";

interface Input {
  page?: number;
  pageSize?: number;
  sort?: string;
}

/** `GET /v1/conversations` — verified against the Core Resources OAS. */
const conversationList: ActionDefinition<Input> = {
  key: "conversation-list",
  type: "read",
  resource: "conversation",
  title: "List Conversations",
  description: "Page through conversation records.",
  params: [
    ...pagination,
    {
      key: "sort",
      label: "Sort",
      type: "string",
      advanced: true,
      hint: "A field name, e.g. `createdAt`. Prefix with `-` for descending.",
    },
  ],
  output: listOutput,

  execute(input, ctx) {
    return new KustomerClient(ctx).json("/conversations", {
      query: { page: input.page, pageSize: input.pageSize, sort: input.sort },
    });
  },
};

export default conversationList;
