import type { ActionDefinition } from "@w6w/types";
import { HubSpotClient } from "../lib/client.ts";

interface Input {
  listId: string;
}

/**
 * Contact lists live on the v1 lists API (`/contacts/v1/lists/{listId}`).
 * Static + dynamic lists share the same endpoint; the returned envelope tells
 * you which is which.
 */
const getList: ActionDefinition<Input> = {
  key: "get-list",
  type: "read",
  resource: "list",
  title: "Get Contact List",
  description: "Fetch a contact list by ID.",
  params: [
    { key: "listId", label: "List ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new HubSpotClient(ctx);
    return client.request(`/contacts/v1/lists/${encodeURIComponent(input.listId)}`);
  },
};

export default getList;
