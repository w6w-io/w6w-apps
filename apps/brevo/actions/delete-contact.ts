import type { ActionDefinition } from "@w6w/types";
import { BrevoClient } from "../lib/client.ts";

interface Input {
  identifier: string;
}

const deleteContact: ActionDefinition<Input> = {
  key: "delete-contact",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description: "Delete a contact by email, ID, or SMS attribute value.",
  idempotent: true,
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
    await client.request(`/contacts/${encodeURIComponent(input.identifier)}`, {
      method: "DELETE",
    });
    return { success: true };
  },
};

export default deleteContact;
