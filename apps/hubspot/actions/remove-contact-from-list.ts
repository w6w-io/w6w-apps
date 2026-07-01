import type { ActionDefinition } from "@w6w/types";
import { HubSpotClient } from "../lib/client.ts";

interface Input {
  listId: string;
  vids: number[];
}

const removeContactFromList: ActionDefinition<Input> = {
  key: "remove-contact-from-list",
  type: "perform",
  resource: "list",
  title: "Remove Contact from List",
  description: "Remove contacts from a static list, by VID.",
  params: [
    { key: "listId", label: "List ID", type: "string", required: true },
    { key: "vids", label: "Contact VIDs", type: "json", required: true },
  ],

  async execute(input, ctx) {
    const client = new HubSpotClient(ctx);
    return client.request(`/contacts/v1/lists/${encodeURIComponent(input.listId)}/remove`, {
      method: "POST",
      body: { vids: input.vids },
    });
  },
};

export default removeContactFromList;
