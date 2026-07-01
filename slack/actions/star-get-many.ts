import type { ActionDefinition } from "@w6w/types";
import { SlackClient } from "../lib/client.ts";

interface Input {
  limit?: number;
  cursor?: string;
}

const starGetMany: ActionDefinition<Input> = {
  key: "star-get-many",
  type: "read",
  resource: "star",
  title: "Get Many Stars",
  description: "Lists starred items for the authenticated user (stars.list).",
  params: [
    { key: "limit", label: "Limit", type: "number", default: 100 },
    { key: "cursor", label: "Cursor", type: "string" },
  ],

  async execute(input, ctx) {
    const client = new SlackClient(ctx);
    return client.request("/stars.list", {
      query: { limit: input.limit ?? 100, cursor: input.cursor },
    });
  },
};

export default starGetMany;
