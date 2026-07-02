import type { ActionDefinition } from "@w6w/types";
import { BrevoClient } from "../lib/client.ts";

interface Input {
  identifier: string;
}

const getContact: ActionDefinition<Input> = {
  key: "get-contact",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Retrieve a single contact by email, ID, or SMS attribute value.",
  params: [
    {
      key: "identifier",
      label: "Contact Identifier",
      type: "string",
      required: true,
      hint: "Email (URL-encoded), contact ID, or SMS attribute value.",
    },
  ],

  async execute(input, ctx) {
    const client = new BrevoClient(ctx);
    return client.request(`/contacts/${encodeURIComponent(input.identifier)}`);
  },
};

export default getContact;
