import type { ActionDefinition } from "@w6w/types";
import { HubSpotClient } from "../lib/client.ts";

interface Input {
  count?: number;
  offset?: number;
}

const listLists: ActionDefinition<Input> = {
  key: "list-lists",
  type: "read",
  resource: "list",
  title: "List Contact Lists",
  description: "Enumerate contact lists in the portal.",
  params: [
    { key: "count", label: "Count", type: "number", default: 100 },
    { key: "offset", label: "Offset", type: "number" },
  ],
  output: [
    { key: "lists", type: "array", label: "Lists" },
    { key: "offset", type: "number", label: "Next offset" },
    { key: "has-more", type: "boolean", label: "Has more" },
  ],

  async execute(input, ctx) {
    const client = new HubSpotClient(ctx);
    return client.request(`/contacts/v1/lists`, {
      query: { count: input.count ?? 100, offset: input.offset },
    });
  },
};

export default listLists;
