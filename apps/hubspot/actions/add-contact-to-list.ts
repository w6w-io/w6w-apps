import type { ActionDefinition } from "@w6w/types";
import { HubSpotClient } from "../lib/client.ts";

interface Input {
  listId: string;
  emails?: string[];
  vids?: number[];
}

const addContactToList: ActionDefinition<Input> = {
  key: "add-contact-to-list",
  type: "perform",
  resource: "list",
  title: "Add Contact to List",
  description: "Add one or more contacts to a static list, by email or by contact VID.",
  params: [
    { key: "listId", label: "List ID", type: "string", required: true },
    { key: "emails", label: "Emails", type: "json", hint: "Array of contact emails." },
    { key: "vids", label: "Contact VIDs", type: "json", hint: "Array of numeric contact IDs." },
  ],

  async execute(input, ctx) {
    const client = new HubSpotClient(ctx);
    return client.request(`/contacts/v1/lists/${encodeURIComponent(input.listId)}/add`, {
      method: "POST",
      body: {
        emails: input.emails ?? [],
        vids: input.vids ?? [],
      },
    });
  },
};

export default addContactToList;
