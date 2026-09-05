import type { ActionDefinition } from "@w6w/types";
import { OmnisendClient } from "../lib/client.ts";

interface Input {
  contactID: string;
}

/** https://api-docs.omnisend.com/reference/get_contacts-id */
const getContact: ActionDefinition<Input> = {
  key: "get-contact",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Retrieve a single contact by ID.",
  params: [
    { key: "contactID", label: "Contact ID", type: "string", required: true },
  ],

  execute(input, ctx) {
    const client = new OmnisendClient(ctx);
    return client.request(`/contacts/${encodeURIComponent(input.contactID)}`);
  },
};

export default getContact;
