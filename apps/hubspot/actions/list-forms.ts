import type { ActionDefinition } from "@w6w/types";
import { HubSpotClient } from "../lib/client.ts";

interface Input {
  limit?: number;
  after?: string;
  archived?: boolean;
}

const listForms: ActionDefinition<Input> = {
  key: "list-forms",
  type: "read",
  resource: "form",
  title: "List Forms",
  description: "List Marketing forms defined in the portal.",
  params: [
    { key: "limit", label: "Limit", type: "number", default: 100 },
    { key: "after", label: "After (cursor)", type: "string" },
    { key: "archived", label: "Include archived", type: "boolean", default: false },
  ],

  async execute(input, ctx) {
    const client = new HubSpotClient(ctx);
    return client.request(`/marketing/v3/forms/`, {
      query: {
        limit: input.limit ?? 100,
        after: input.after,
        archived: input.archived,
      },
    });
  },
};

export default listForms;
