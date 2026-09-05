import type { ActionDefinition } from "@w6w/types";
import { GivebutterClient, type PageEnvelope } from "../lib/client.ts";
import { paginationParams, paginationQuery } from "../lib/params.ts";

interface Input {
  page?: number;
  per_page?: number;
}

const messageList: ActionDefinition<Input> = {
  key: "message-list",
  type: "read",
  resource: "message",
  title: "List Messages",
  description:
    "List outbound messages (emails/texts sent from a campaign) on the connected account.",
  params: [...paginationParams()],
  output: [
    { key: "data", type: "array", label: "Messages" },
    { key: "meta", type: "object", label: "Pagination metadata" },
  ],

  async execute(input, ctx) {
    return await new GivebutterClient(ctx).page("/messages", {
      query: paginationQuery(input),
    }) as PageEnvelope<unknown>;
  },
};

export default messageList;
